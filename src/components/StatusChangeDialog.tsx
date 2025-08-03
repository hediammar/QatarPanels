import React, { useState, useRef } from 'react';
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

const PANEL_STATUSES = [
  "Issued For Production",
  "Produced",
  "Inspected",
  "Approved Material",
  "Rejected Material",
  "Issued",
  "Proceed for Delivery",
  "Delivered",
  "Installed",
  "Approved Final",
  "Broken at Site",
  "On Hold",
  "Cancelled",
] as const;

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Map database integers to UI strings
  const statusMap: { [key: number]: PanelStatus } = PANEL_STATUSES.reduce((acc, status, index) => ({ ...acc, [index]: status }), {});
  const statusReverseMap = Object.fromEntries(Object.entries(statusMap).map(([k, v]) => [v, parseInt(k)]));

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
    if (!panel) return;

    if (newStatus === panel.status) {
      showToast('Please select a different status', 'error');
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
      await crudOperations.update("panels", panel.id, { 
        status: newStatus 
      });

      // Insert status history with image and notes
      const { error: historyError } = await supabase
        .from('panel_status_histories')
        .insert({
          panel_id: panel.id,
          status: newStatus,
          user_id: currentUser?.id,
          notes: notes.trim() || null,
          image_url: imageUrl,
          created_at: new Date().toISOString()
        });

      if (historyError) {
        console.error('Error inserting status history:', historyError);
        showToast('Status updated but failed to save history', 'error');
      } else {
        showToast('Panel status updated successfully', 'success');
      }

      // Reset form
      setNewStatus(0);
      setNotes('');
      setSelectedImage(null);
      setImagePreview(null);
      
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
    onClose();
  };

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
                {PANEL_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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

          {newStatus === panel?.status && (
            <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <span className="text-sm text-yellow-800">
                Please select a different status to update
              </span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || newStatus === panel?.status}
          >
            {isSubmitting ? 'Updating...' : 'Update Status'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 