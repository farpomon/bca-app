import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  ClipboardList,
  AlertTriangle,
  Wrench,
  FileText,
  Calendar,
  Plus,
  Search,
  Filter,
  Clock,
  CheckCircle2,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { format } from "date-fns";

type EventType = "assessment" | "deficiency" | "maintenance" | "document" | "schedule" | "custom";

interface TimelineEvent {
  id: number;
  eventType: EventType;
  eventDate: string;
  title: string;
  description: string | null;
  relatedId: number | null;
  metadata: string | null;
  createdBy: number | null;
  createdAt: string;
}

interface AssetTimelineProps {
  assetId: number;
  projectId: number;
}

const eventTypeConfig: Record<
  EventType,
  { icon: LucideIcon; label: string; color: string; bgColor: string }
> = {
  assessment: {
    icon: ClipboardList,
    label: "Assessment",
    color: "text-blue-600",
    bgColor: "bg-blue-50",
  },
  deficiency: {
    icon: AlertTriangle,
    label: "Deficiency",
    color: "text-red-600",
    bgColor: "bg-red-50",
  },
  maintenance: {
    icon: Wrench,
    label: "Maintenance",
    color: "text-green-600",
    bgColor: "bg-green-50",
  },
  document: {
    icon: FileText,
    label: "Document",
    color: "text-purple-600",
    bgColor: "bg-purple-50",
  },
  schedule: {
    icon: Calendar,
    label: "Scheduled",
    color: "text-orange-600",
    bgColor: "bg-orange-50",
  },
  custom: {
    icon: Plus,
    label: "Custom",
    color: "text-gray-600",
    bgColor: "bg-gray-50",
  },
};

const dateRangeOptions = [
  { value: "all", label: "All Time" },
  { value: "30", label: "Last 30 Days" },
  { value: "90", label: "Last 90 Days" },
  { value: "365", label: "Last Year" },
];

// Helper function to format event dates
const formatEventDate = (dateString: string) => {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const isPast = date < now;
    return {
      formatted: format(date, "MMM dd, yyyy 'at' h:mm a"),
      isPast,
    };
  } catch {
    return { formatted: dateString, isPast: true };
  }
};

export default function AssetTimeline({ assetId, projectId }: AssetTimelineProps) {
  const [selectedEventTypes, setSelectedEventTypes] = useState<EventType[]>([]);
  const [dateRange, setDateRange] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null);

  // Calculate date filters based on selected range
  const getDateFilters = () => {
    if (dateRange === "all") return {};

    const endDate = new Date().toISOString();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(dateRange));

    return {
      startDate: startDate.toISOString(),
      endDate,
    };
  };

  const { data: events, isLoading } = trpc.timeline.getAssetTimeline.useQuery({
    assetId,
    projectId,
    filters: {
      eventTypes: selectedEventTypes.length > 0 ? selectedEventTypes : undefined,
      searchQuery: searchQuery || undefined,
      ...getDateFilters(),
    },
  });

  const toggleEventType = (type: EventType) => {
    setSelectedEventTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const getEventIcon = (type: EventType) => {
    const IconComponent = eventTypeConfig[type].icon;
    return <IconComponent className="h-5 w-5" />;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Clock className="h-8 w-8 animate-spin mx-auto mb-2 text-gray-400" />
          <p className="text-sm text-gray-500">Loading timeline...</p>
        </div>
      </div>
    );
  }

  const sortedEvents = events || [];
  const now = new Date();
  const pastEvents = sortedEvents.filter((e) => new Date(e.eventDate) < now);
  const futureEvents = sortedEvents.filter((e) => new Date(e.eventDate) >= now);

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {dateRangeOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Event Type Filters */}
      <div className="flex flex-wrap gap-2">
        {(Object.keys(eventTypeConfig) as EventType[]).map((type) => {
          const config = eventTypeConfig[type];
          const isSelected = selectedEventTypes.includes(type);
          return (
            <Button
              key={type}
              variant={isSelected ? "default" : "outline"}
              size="sm"
              onClick={() => toggleEventType(type)}
              className="gap-2"
            >
              {getEventIcon(type)}
              {config.label}
            </Button>
          );
        })}
      </div>

      {/* Timeline */}
      <div className="space-y-8">
        {/* Future Events Section */}
        {futureEvents.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="h-5 w-5 text-orange-600" />
              <h3 className="text-lg font-semibold text-gray-900">Upcoming Events</h3>
              <Badge variant="secondary">{futureEvents.length}</Badge>
            </div>
            <div className="space-y-4">
              {futureEvents.map((event, index) => (
                <TimelineEventCard
                  key={`future-${event.id}-${index}`}
                  event={event}
                  onSelect={setSelectedEvent}
                />
              ))}
            </div>
          </div>
        )}

        {/* Past Events Section */}
        {pastEvents.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Clock className="h-5 w-5 text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-900">Past Events</h3>
              <Badge variant="secondary">{pastEvents.length}</Badge>
            </div>
            <div className="space-y-4">
              {pastEvents.map((event, index) => (
                <TimelineEventCard
                  key={`past-${event.id}-${index}`}
                  event={event}
                  onSelect={setSelectedEvent}
                />
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {sortedEvents.length === 0 && (
          <div className="text-center py-12">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Events Found</h3>
            <p className="text-sm text-gray-500">
              {searchQuery || selectedEventTypes.length > 0
                ? "Try adjusting your filters"
                : "No timeline events recorded for this asset yet"}
            </p>
          </div>
        )}
      </div>

      {/* Event Detail Dialog */}
      {selectedEvent && (
        <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <span className={eventTypeConfig[selectedEvent.eventType].color}>
                  {getEventIcon(selectedEvent.eventType)}
                </span>
                {selectedEvent.title}
              </DialogTitle>
              <DialogDescription>
                {formatEventDate(selectedEvent.eventDate).formatted}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-1">Event Type</h4>
                <Badge variant="secondary">{eventTypeConfig[selectedEvent.eventType].label}</Badge>
              </div>
              {selectedEvent.description && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-1">Description</h4>
                  <p className="text-sm text-gray-600">{selectedEvent.description}</p>
                </div>
              )}
              {selectedEvent.metadata && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-1">Additional Details</h4>
                  <pre className="text-xs bg-gray-50 p-3 rounded-md overflow-auto">
                    {JSON.stringify(JSON.parse(selectedEvent.metadata), null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

interface TimelineEventCardProps {
  event: TimelineEvent;
  onSelect: (event: TimelineEvent) => void;
}

function TimelineEventCard({ event, onSelect }: TimelineEventCardProps) {
  const config = eventTypeConfig[event.eventType];
  const { formatted, isPast } = formatEventDate(event.eventDate);
  const IconComponent = config.icon;

  return (
    <Card
      className="p-4 hover:shadow-md transition-shadow cursor-pointer border-l-4"
      style={{ borderLeftColor: config.color.replace("text-", "#") }}
      onClick={() => onSelect(event)}
    >
      <div className="flex items-start gap-4">
        <div className={`p-2 rounded-lg ${config.bgColor}`}>
          <IconComponent className={`h-5 w-5 ${config.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h4 className="font-medium text-gray-900 truncate">{event.title}</h4>
            {isPast ? (
              <CheckCircle2 className="h-4 w-4 text-gray-400 flex-shrink-0" />
            ) : (
              <Clock className="h-4 w-4 text-orange-500 flex-shrink-0" />
            )}
          </div>
          <p className="text-sm text-gray-600 mb-2">{formatted}</p>
          {event.description && (
            <p className="text-sm text-gray-500 line-clamp-2">{event.description}</p>
          )}
        </div>
      </div>
    </Card>
  );
}
