import { Avatar } from "./ui/avatar";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { User, Settings, LogOut } from "lucide-react";

export function UserHeader() {
  return (
    <header className="sticky-header border-b border-sidebar-border bg-background/95 backdrop-blur-sm">
      <div className="flex items-center justify-between px-4 sm:px-6 py-3">
        <div className="flex items-center gap-4">
          <h2>Qatar Panel Tracker</h2>
        </div>
        
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-xs">
            Admin User
          </Badge>
          
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <div className="h-full w-full bg-primary rounded-full flex items-center justify-center">
                <User className="h-4 w-4 text-primary-foreground" />
              </div>
            </Avatar>
            
            <div className="hidden sm:block">
              <p className="text-sm font-medium">John Smith</p>
              <p className="text-xs text-muted-foreground">Administrator</p>
            </div>
          </div>
          
          <Button variant="ghost" size="sm">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}