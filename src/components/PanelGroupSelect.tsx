import React, { useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Input } from './ui/input';

interface PanelGroupOption {
  id: string;
  name: string;
  project_name?: string;
}

interface PanelGroupSelectProps {
  panelGroups: PanelGroupOption[];
  onAdd: (groupId: string) => void;
  placeholder?: string;
}

/**
 * Panel groups dropdown with a search box and a capped, scrollable list.
 * Key presses inside the search box are stopped so Radix's typeahead doesn't
 * hijack typing; Escape is passed through so the dropdown still closes.
 */
const PanelGroupSelect: React.FC<PanelGroupSelectProps> = ({
  panelGroups,
  onAdd,
  placeholder = 'Select panel groups to add'
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  const normalizedSearch = search.trim().toLowerCase();
  const filteredGroups = normalizedSearch
    ? panelGroups.filter(
        (group) =>
          group.name.toLowerCase().includes(normalizedSearch) ||
          (group.project_name || '').toLowerCase().includes(normalizedSearch)
      )
    : panelGroups;

  const formatGroupLabel = (group: PanelGroupOption) =>
    group.project_name ? `${group.name} - ${group.project_name}` : group.name;

  return (
    <Select
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
        setSearch('');
        if (isOpen) {
          setTimeout(() => searchInputRef.current?.focus(), 0);
        }
      }}
      value=""
      onValueChange={(value) => {
        if (value) onAdd(value);
      }}
    >
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <div
          className="bg-popover mb-1 border-b border-border px-2 pb-2 pt-1"
          onKeyDown={(e) => {
            if (e.key !== 'Escape') e.stopPropagation();
          }}
        >
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search panel groups..."
              className="h-8 pl-8"
            />
          </div>
        </div>
        {filteredGroups.length === 0 ? (
          <div className="px-2 py-4 text-center text-sm text-muted-foreground">
            No panel groups found
          </div>
        ) : (
          <div className="max-h-60 overflow-y-auto">
            {filteredGroups.map((group) => (
              <SelectItem key={group.id} value={group.id}>
                {formatGroupLabel(group)}
              </SelectItem>
            ))}
          </div>
        )}
      </SelectContent>
    </Select>
  );
};

export default PanelGroupSelect;
