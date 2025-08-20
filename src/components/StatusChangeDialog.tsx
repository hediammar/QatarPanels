import React, { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Upload, X, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToastContext } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { crudOperations } from '../utils/userTracking';
import { 
  PANEL_STATUSES, 
  validateStatusTransition, 
  validateStatusTransitionWithRole,
  getValidNextStatuses,
  getValidNextStatusesForRole,
  isSpecialStatus 
} from '../utils/statusValidation';

type PanelStatus = (typeof PANEL_STATUSES)[number];

interface PanelModel {
  id: string;
  name: string;
  type: number;
  status: number;
  project_id: string;
  project_name?: string;
  building_id?: string;
  building_name?: string;
  facade_id?: string;
  facade_name?: string;
  issue_transmittal_no?: string;
  drawing_number?: string;
  unit_rate_qr_m2?: number;
  ifp_qty_area_sm?: number;
  ifp_qty_nos?: number;
  weight?: number;
  dimension?: string;
  issued_for_production_date?: string;
}

interface StatusChangeDialogProps {
  panel: PanelModel | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusChanged: () => void;
}

export function StatusChangeDialog({ panel, isOpen, onClose, onStatusChanged }: StatusChangeDialogProps) {
  const { showToast } = useToastContext();
  const { user: currentUser } = useAuth();
  const [newStatus, setNewStatus] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Map database integers to UI strings
  const statusMap: { [key: number]: PanelStatus } = PANEL_STATUSES.reduce((acc, status, index) => ({ ...acc, [index]: status }), {});
  const statusReverseMap = Object.fromEntries(Object.entries(statusMap).map(([k, v]) => [v, parseInt(k)]));

  // Get valid next statuses for the current panel status and user role
  const getValidStatuses = () => {
    if (!panel || !currentUser?.role) return [];
    
    const validNextStatuses = getValidNextStatusesForRole(panel.status, currentUser.role);
    const allStatuses = PANEL_STATUSES.map((_, index) => index);
    
    // Include special statuses (On Hold, Cancelled) that can be set from any status
    const specialStatuses = allStatuses.filter(status => isSpecialStatus(status));
    
    // Combine valid next statuses with special statuses, removing duplicates
    const validStatuses = Array.from(new Set([...validNextStatuses, ...specialStatuses]));
    
    return validStatuses.sort((a, b) => a - b);
  };

  // Validate status transition when newStatus changes
  useEffect(() => {
    if (panel && newStatus !== panel.status && currentUser?.role) {
      const validation = validateStatusTransitionWithRole(panel.status, newStatus, currentUser.role);
      setValidationError(validation.error || '');
    } else {
      setValidationError('');
    }
  }, [panel, newStatus, currentUser?.role]);

  // Reset form when panel changes
  useEffect(() => {
    if (panel) {
      setNewStatus(panel.status);
      setValidationError('');
    }
  }, [panel]);

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        showToast('Please select a valid image file', 'error');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        showToast('Image file size must be less than 5MB', 'error');
        return;
      }

      setSelectedImage(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!selectedImage) return null;

    try {
      const fileExt = selectedImage.name.split('.').pop();
      const fileName = `${panel?.id}_${Date.now()}.${fileExt}`;
      const filePath = `panel-status-images/${fileName}`;

      console.log('Attempting to upload image to:', filePath);
      console.log('File size:', selectedImage.size, 'bytes');
      console.log('File type:', selectedImage.type);

      const { data, error: uploadError } = await supabase.storage
        .from('panel-images')
        .upload(filePath, selectedImage, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Error uploading image:', uploadError);
        showToast(`Failed to upload image: ${uploadError.message}`, 'error');
        return null;
      }

      console.log('Upload successful:', data);

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('panel-images')
        .getPublicUrl(filePath);

      console.log('Public URL:', publicUrl);
      return publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      showToast(`Failed to upload image: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
      return null;
    }
  };

  const handleSubmit = async () => {
    if (!panel || !currentUser?.role) return;

    // Validate status transition with role-based restrictions
    const validation = validateStatusTransitionWithRole(panel.status, newStatus, currentUser.role);
    if (!validation.isValid) {
      showToast(validation.error || 'Invalid status transition', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      // Upload image if selected
      let imageUrl = null;
      if (selectedImage) {
        imageUrl = await uploadImage();
        if (!imageUrl) {
          setIsSubmitting(false);
          return;
        }
      }

      // Update panel status with user tracking
      // The database trigger will automatically insert a record into panel_status_histories
      await crudOperations.update("panels", panel.id, { 
        status: newStatus 
      });

      // If we have additional data (notes or image), update the most recent history record
      if (notes.trim() || imageUrl) {
        const { data: historyData, error: historyFetchError } = await supabase
          .from('panel_status_histories')
          .select('id')
          .eq('panel_id', panel.id)
          .eq('status', newStatus)
          .order('created_at', { ascending: false })
          .limit(1);

        if (!historyFetchError && historyData && historyData.length > 0) {
          const updateData: any = {};
          if (notes.trim()) updateData.notes = notes.trim();
          if (imageUrl) updateData.image_url = imageUrl;

          const { error: historyUpdateError } = await supabase
            .from('panel_status_histories')
            .update(updateData)
            .eq('id', historyData[0].id);

          if (historyUpdateError) {
            console.error('Error updating status history with additional data:', historyUpdateError);
            showToast('Status updated but failed to save additional data', 'error');
          } else {
            showToast('Panel status updated successfully', 'success');
          }
        } else {
          showToast('Panel status updated successfully', 'success');
        }
      } else {
        showToast('Panel status updated successfully', 'success');
      }

      // Reset form
      setNewStatus(0);
      setNotes('');
      setSelectedImage(null);
      setImagePreview(null);
      setValidationError('');
      
      onStatusChanged();
      onClose();
    } catch (error) {
      console.error('Error updating panel status:', error);
      showToast('Failed to update panel status', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setNewStatus(0);
    setNotes('');
    setSelectedImage(null);
    setImagePreview(null);
    setValidationError('');
    onClose();
  };

  const validStatuses = getValidStatuses();

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Update Panel Status</DialogTitle>
          <DialogDescription>
            Change status for panel "{panel?.name}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current-status">Current Status</Label>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                {panel ? statusMap[panel.status] : 'Unknown'}
              </Badge>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-status">New Status *</Label>
            <Select
              value={statusMap[newStatus]}
              onValueChange={(value) => setNewStatus(statusReverseMap[value])}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select new status" />
              </SelectTrigger>
              <SelectContent>
                {validStatuses.map((statusIndex) => {
                  const statusName = statusMap[statusIndex];
                  const isSpecial = isSpecialStatus(statusIndex);
                  return (
                    <SelectItem key={statusIndex} value={statusName}>
                      <div className="flex items-center gap-2">
                        <span>{statusName}</span>
                        {isSpecial && (
                          <Badge variant="outline" className="text-xs">
                            Special
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            {validStatuses.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No valid status transitions available for current status.
              </p>
            )}
          </div>

          {validationError && (
            <div className="flex items-center gap-2 p-3 bg-destructive/15 border border-destructive/20 text-destructive rounded-lg">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{validationError}</span>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any notes about this status change..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Upload Image (Optional)</Label>
            <div className="space-y-2">
              {!imagePreview ? (
                <div
                  className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 text-center hover:border-muted-foreground/50 transition-colors cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Click to upload image</p>
                  <p className="text-xs text-muted-foreground">Max 5MB, JPG, PNG, GIF</p>
                </div>
              ) : (
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-32 object-cover rounded-lg"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2 h-6 w-6 p-0"
                    onClick={removeImage}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || newStatus === panel?.status || !!validationError}
          >
            {isSubmitting ? 'Updating...' : 'Update Status'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 