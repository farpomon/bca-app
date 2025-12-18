import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export interface TabItem {
  value: string;
  label: string;
  icon: React.ReactNode;
  description: string;
  isPrimary?: boolean;
}

interface TabsWithDropdownProps {
  tabs: TabItem[];
  defaultValue: string;
  children: React.ReactNode;
  className?: string;
}

export function TabsWithDropdown({ 
  tabs, 
  defaultValue, 
  children,
  className 
}: TabsWithDropdownProps) {
  const [activeTab, setActiveTab] = useState(defaultValue);

  // Separate primary and secondary tabs
  const primaryTabs = tabs.filter(tab => tab.isPrimary !== false);
  const secondaryTabs = tabs.filter(tab => tab.isPrimary === false);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className={className}>
      <div className="relative">
        <TabsList className="w-full justify-start overflow-x-auto scrollbar-hide">
          {primaryTabs.map((tab) => (
            <Tooltip key={tab.value}>
              <TooltipTrigger asChild>
                <TabsTrigger 
                  value={tab.value} 
                  className="flex-none px-3 whitespace-nowrap"
                >
                  {tab.icon}
                  {tab.label}
                </TabsTrigger>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <p className="text-sm">{tab.description}</p>
              </TooltipContent>
            </Tooltip>
          ))}

          {secondaryTabs.length > 0 && (
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant={secondaryTabs.some(t => t.value === activeTab) ? "default" : "ghost"}
                      size="sm"
                      className="flex-none px-3 h-9"
                    >
                      <MoreHorizontal className="h-4 w-4 mr-2" />
                      More
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p className="text-sm">Additional tabs and features</p>
                </TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="end" className="w-56">
                {secondaryTabs.map((tab) => (
                  <DropdownMenuItem
                    key={tab.value}
                    onClick={() => handleTabChange(tab.value)}
                    className="cursor-pointer"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">{tab.icon}</div>
                      <div className="flex-1">
                        <div className="font-medium">{tab.label}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {tab.description}
                        </div>
                      </div>
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </TabsList>
      </div>
      {children}
    </Tabs>
  );
}
