import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Clock, Calendar } from "lucide-react";

interface MFATimeRestrictionDialogProps {
  open: boolean;
  onClose: () => void;
  userId: number;
  userName: string;
  existingRestriction?: any;
}

type RestrictionType = 'always' | 'business_hours' | 'after_hours' | 'custom_schedule' | 'never';

const DAYS_OF_WEEK = [
  { value: 'monday', label: 'Monday' },
  { value: 'tuesday', label: 'Tuesday' },
  { value: 'wednesday', label: 'Wednesday' },
  { value: 'thursday', label: 'Thursday' },
  { value: 'friday', label: 'Friday' },
  { value: 'saturday', label: 'Saturday' },
  { value: 'sunday', label: 'Sunday' },
] as const;

const TIMEZONES = [
  { value: 'America/Vancouver', label: 'Pacific Time (Vancouver)' },
  { value: 'America/Edmonton', label: 'Mountain Time (Edmonton)' },
  { value: 'America/Toronto', label: 'Eastern Time (Toronto)' },
  { value: 'America/Halifax', label: 'Atlantic Time (Halifax)' },
  { value: 'America/St_Johns', label: 'Newfoundland Time' },
  { value: 'UTC', label: 'UTC' },
] as const;

export function MFATimeRestrictionDialog({
  open,
  onClose,
  userId,
  userName,
  existingRestriction,
}: MFATimeRestrictionDialogProps) {
  const utils = trpc.useUtils();

  const [restrictionType, setRestrictionType] = useState<RestrictionType>('always');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [selectedDays, setSelectedDays] = useState<('monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday')[]>(['monday', 'tuesday', 'wednesday', 'thursday', 'friday']);
  const [timezone, setTimezone] = useState('America/Vancouver');
  const [description, setDescription] = useState('');

  // Load existing restriction data
  useEffect(() => {
    if (existingRestriction) {
      setRestrictionType(existingRestriction.restrictionType);
      setStartTime(existingRestriction.startTime || '09:00');
      setEndTime(existingRestriction.endTime || '17:00');
      setSelectedDays(existingRestriction.daysOfWeek || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']);
      setTimezone(existingRestriction.timezone || 'America/Vancouver');
      setDescription(existingRestriction.description || '');
    }
  }, [existingRestriction]);

  const createMutation = trpc.mfaTimeRestrictions.createRestriction.useMutation({
    onSuccess: () => {
      toast.success('MFA time restriction created successfully');
      utils.admin.getAllUsers.invalidate();
      utils.mfaTimeRestrictions.getUserRestrictions.invalidate();
      onClose();
    },
    onError: (error) => {
      toast.error(`Failed to create restriction: ${error.message}`);
    },
  });

  const updateMutation = trpc.mfaTimeRestrictions.updateRestriction.useMutation({
    onSuccess: () => {
      toast.success('MFA time restriction updated successfully');
      utils.admin.getAllUsers.invalidate();
      utils.mfaTimeRestrictions.getUserRestrictions.invalidate();
      onClose();
    },
    onError: (error) => {
      toast.error(`Failed to update restriction: ${error.message}`);
    },
  });

  type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  
  const handleDayToggle = (day: DayOfWeek) => {
    setSelectedDays(prev =>
      prev.includes(day)
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };

  const handleSave = () => {
    const data = {
      userId,
      restrictionType,
      startTime: restrictionType === 'always' || restrictionType === 'never' ? undefined : startTime,
      endTime: restrictionType === 'always' || restrictionType === 'never' ? undefined : endTime,
      daysOfWeek: restrictionType === 'always' || restrictionType === 'never' ? undefined : selectedDays,
      timezone,
      description: description || undefined,
    };

    if (existingRestriction) {
      updateMutation.mutate({
        restrictionId: existingRestriction.id,
        ...data,
      });
    } else {
      createMutation.mutate(data);
    }
  };

  const showTimeSettings = restrictionType !== 'always' && restrictionType !== 'never';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {existingRestriction ? 'Edit' : 'Set'} MFA Time Restriction for {userName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Restriction Type */}
          <div className="space-y-2">
            <Label htmlFor="restrictionType">Restriction Type</Label>
            <Select value={restrictionType} onValueChange={(value) => setRestrictionType(value as RestrictionType)}>
              <SelectTrigger id="restrictionType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="always">Always Require MFA</SelectItem>
                <SelectItem value="business_hours">Business Hours Only</SelectItem>
                <SelectItem value="after_hours">After Hours Only</SelectItem>
                <SelectItem value="custom_schedule">Custom Schedule</SelectItem>
                <SelectItem value="never">Never Require MFA</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              {restrictionType === 'always' && 'MFA will be required at all times'}
              {restrictionType === 'business_hours' && 'MFA will be required during business hours (default: Mon-Fri, 9 AM - 5 PM)'}
              {restrictionType === 'after_hours' && 'MFA will be required after business hours and on weekends'}
              {restrictionType === 'custom_schedule' && 'Define a custom schedule for MFA requirements'}
              {restrictionType === 'never' && 'MFA will not be required based on time (other MFA settings may still apply)'}
            </p>
          </div>

          {showTimeSettings && (
            <>
              {/* Time Range */}
              <div className="space-y-4">
                <Label className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Time Range
                </Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startTime" className="text-sm">Start Time</Label>
                    <Input
                      id="startTime"
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endTime" className="text-sm">End Time</Label>
                    <Input
                      id="endTime"
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                    />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Times that cross midnight (e.g., 17:00 - 09:00) are supported for after-hours restrictions
                </p>
              </div>

              {/* Days of Week */}
              <div className="space-y-4">
                <Label className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Days of Week
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  {DAYS_OF_WEEK.map((day) => (
                    <div key={day.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={day.value}
                        checked={selectedDays.includes(day.value)}
                        onCheckedChange={() => handleDayToggle(day.value)}
                      />
                      <Label
                        htmlFor={day.value}
                        className="text-sm font-normal cursor-pointer"
                      >
                        {day.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Timezone */}
              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Select value={timezone} onValueChange={setTimezone}>
                  <SelectTrigger id="timezone">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map((tz) => (
                      <SelectItem key={tz.value} value={tz.value}>
                        {tz.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              placeholder="Add a note about this restriction..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            {createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save Restriction'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
