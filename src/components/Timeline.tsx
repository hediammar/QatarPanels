import { AlertCircle, Ban, CheckCircle, Clock, Package, PauseCircle, Truck, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { PanelModel } from './project-details/PanelsSection';
import { Badge } from './ui/badge';

interface TimelineProps {
  panel: PanelModel;
}

interface StatusHistoryEntry {
  status: string;
  timestamp: string;
  previousStatus?: string;
}

const PANEL_STATUSES = [
  'Issued For Production',
  'Produced',
  'Inspected',
  'Approved Material',
  'Rejected Material',
  'Issued',
  'Proceed for Delivery',
  'Delivered',
  'Installed',
  'Approved Final',
  'Broken at Site',
  'On Hold',
  'Cancelled',
] as const;

export function Timeline({ panel }: TimelineProps) {
  const [statusHistory, setStatusHistory] = useState<StatusHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Map integer status from database to human-readable status
  const statusMap: { [key: number]: string } = Object.fromEntries(
    PANEL_STATUSES.map((status, index) => [index, status])
  );

  // Fetch status history from Supabase
  useEffect(() => {
    async function fetchStatusHistory() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('panel_status_histories')
          .select('status, created_at')
          .eq('panel_id', panel.id)
          .order('created_at', { ascending: false });

        if (error) {
          throw error;
        }

        const history: StatusHistoryEntry[] = data.map((entry, index, arr) => ({
          status: statusMap[entry.status] || 'Unknown',
          timestamp: entry.created_at,
          previousStatus: index < arr.length - 1 ? statusMap[arr[index + 1].status] || 'Unknown' : undefined,
        }));

        setStatusHistory(history);
      } catch (err) {
        setError('Failed to fetch status history');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchStatusHistory();
  }, [panel.id]);

  const getStatusColor = (status: string) => {
    const statusColors: Record<string, string> = {
      'Produced': 'bg-status-produced text-status-produced-foreground',
      "Issued For Production": 'bg-status-checked text-status-checked-foreground',
      'Inspected': 'bg-status-inspected text-status-inspected-foreground',
      'Approved Material': 'bg-status-approved-material text-status-approved-material-foreground',
      'Rejected Material': 'bg-status-rejected-material text-status-rejected-material-foreground',
      'Issued': 'bg-status-issued text-status-issued-foreground',
      'Proceed for Delivery': 'bg-status-proceed-delivery text-status-proceed-delivery-foreground',
      'Delivered': 'bg-status-delivered text-status-delivered-foreground',
      'Installed': 'bg-status-installed text-status-installed-foreground',
      'Approved Final': 'bg-status-approved-final text-status-approved-final-foreground',
      'Broken at Site': 'bg-status-broken text-status-broken-foreground',
      'On Hold': 'bg-status-held text-status-held-foreground',
      'Cancelled': 'bg-status-cancelled text-status-cancelled-foreground',
    };

    return statusColors[status] || 'bg-secondary text-secondary-foreground';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Issued For Production':
        return <Package className="h-4 w-4" />;
      case 'Produced':
        return <Package className="h-4 w-4" />;
      case 'Inspected':
        return <AlertCircle className="h-4 w-4" />;
      case 'Approved Material':
        return <CheckCircle className="h-4 w-4" />;
      case 'Rejected Material':
        return <XCircle className="h-4 w-4" />;
      case 'Issued':
        return <Package className="h-4 w-4" />;
      case 'Proceed for Delivery':
        return <Truck className="h-4 w-4" />;
      case 'Delivered':
        return <Truck className="h-4 w-4" />;
      case 'Installed':
        return <CheckCircle className="h-4 w-4" />;
      case 'Approved Final':
        return <CheckCircle className="h-4 w-4" />;
      case 'Broken at Site':
        return <XCircle className="h-4 w-4" />;
      case 'On Hold':
        return <PauseCircle className="h-4 w-4" />;
      case 'Cancelled':
        return <Ban className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const formatDateTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return {
      date: date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
      time: date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }),
    };
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Loading status history...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {statusHistory.length > 0 ? (
        <div className="space-y-4">
          {statusHistory.map((entry, index) => {
            const { date, time } = formatDateTime(entry.timestamp);
            const isLatest = index === 0;

            return (
              <div key={index} className="flex items-start gap-4">
                <div className="flex flex-col items-center">
                  <div className={`p-2 rounded-full ${isLatest ? 'bg-primary' : 'bg-muted'}`}>
                    {getStatusIcon(entry.status)}
                  </div>
                  {index < statusHistory.length - 1 && (
                    <div className="w-0.5 h-8 bg-border mt-2" />
                  )}
                </div>

                <div className="flex-1 min-w-0 pb-4">
                  <div className="flex items-center gap-3 mb-2">
                    <Badge className={getStatusColor(entry.status)}>{entry.status}</Badge>
                    <span className="text-sm text-muted-foreground">
                      {date} at {time}
                    </span>
                  </div>

                  {entry.previousStatus && (
                    <p className="text-sm text-muted-foreground mb-1">
                      Changed from {entry.previousStatus} to {entry.status}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8">
          <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">No status history available</p>
        </div>
      )}
    </div>
  );
}