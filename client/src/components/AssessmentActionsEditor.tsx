import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Plus, Trash2, GripVertical, ChevronDown, ChevronRight, AlertTriangle, Clock, DollarSign, Library } from "lucide-react";
import { VoiceInputButton } from "@/components/VoiceInputButton";
import { ActionTemplatesDialog } from "@/components/ActionTemplatesDialog";
import { cn } from "@/lib/utils";

export interface AssessmentAction {
  id?: number;
  description: string;
  priority?: 'immediate' | 'short_term' | 'medium_term' | 'long_term';
  timeline?: string;
  estimatedCost?: number;
  consequenceOfDeferral?: string;
  confidence?: number;
  sortOrder?: number;
}

interface AssessmentActionsEditorProps {
  actions: AssessmentAction[];
  onChange: (actions: AssessmentAction[]) => void;
  disabled?: boolean;
  className?: string;
}

const PRIORITY_OPTIONS = [
  { value: 'immediate', label: 'Immediate (0-1 year)', color: 'bg-red-100 text-red-800 border-red-200' },
  { value: 'short_term', label: 'Short Term (1-3 years)', color: 'bg-orange-100 text-orange-800 border-orange-200' },
  { value: 'medium_term', label: 'Medium Term (3-5 years)', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  { value: 'long_term', label: 'Long Term (5+ years)', color: 'bg-green-100 text-green-800 border-green-200' },
];

const TIMELINE_OPTIONS = [
  '0-1 years',
  '1-2 years',
  '2-3 years',
  '3-5 years',
  '5-7 years',
  '7-10 years',
  '10+ years',
];

export function AssessmentActionsEditor({
  actions,
  onChange,
  disabled,
  className,
  uniformatCode,
}: AssessmentActionsEditorProps & { uniformatCode?: string | null }) {
  const [showTemplatesDialog, setShowTemplatesDialog] = useState(false);
  const [expandedActions, setExpandedActions] = useState<Set<number>>(new Set([0]));
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Initialize with one empty action if none exist
  useEffect(() => {
    if (actions.length === 0) {
      onChange([createEmptyAction(0)]);
    }
  }, []);

  const createEmptyAction = (sortOrder: number): AssessmentAction => ({
    description: '',
    priority: 'medium_term',
    timeline: '1-3 years',
    estimatedCost: undefined,
    consequenceOfDeferral: '',
    confidence: undefined,
    sortOrder,
  });

  const handleSelectTemplate = (template: any) => {
    console.log('[AssessmentActionsEditor] Template selected:', template);
    console.log('[AssessmentActionsEditor] Current actions:', actions);
    
    const newAction: AssessmentAction = {
      description: template.description,
      priority: template.priority,
      timeline: template.timeline || undefined,
      estimatedCost: template.estimatedCost ? parseFloat(template.estimatedCost) : undefined,
      consequenceOfDeferral: template.consequenceOfDeferral || undefined,
      confidence: template.confidence || undefined,
      sortOrder: actions.length,
    };
    
    console.log('[AssessmentActionsEditor] New action created:', newAction);
    const updatedActions = [...actions, newAction];
    console.log('[AssessmentActionsEditor] Updated actions:', updatedActions);
    
    onChange(updatedActions);
    setExpandedActions(new Set([...expandedActions, actions.length]));
  };

  const handleAddAction = () => {
    const newAction = createEmptyAction(actions.length);
    const newActions = [...actions, newAction];
    onChange(newActions);
    // Expand the new action
    setExpandedActions(prev => new Set([...prev, newActions.length - 1]));
  };

  const handleRemoveAction = (index: number) => {
    if (actions.length <= 1) {
      // Don't remove the last action, just clear it
      onChange([createEmptyAction(0)]);
      return;
    }
    const newActions = actions.filter((_, i) => i !== index);
    // Update sort orders
    newActions.forEach((action, i) => {
      action.sortOrder = i;
    });
    onChange(newActions);
    // Remove from expanded set
    setExpandedActions(prev => {
      const newSet = new Set(prev);
      newSet.delete(index);
      return newSet;
    });
  };

  const handleUpdateAction = (index: number, field: keyof AssessmentAction, value: any) => {
    const newActions = [...actions];
    newActions[index] = { ...newActions[index], [field]: value };
    onChange(newActions);
  };

  const toggleExpanded = (index: number) => {
    setExpandedActions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const newActions = [...actions];
    const [draggedAction] = newActions.splice(draggedIndex, 1);
    newActions.splice(dropIndex, 0, draggedAction);
    
    // Update sort orders
    newActions.forEach((action, i) => {
      action.sortOrder = i;
    });
    
    onChange(newActions);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const getPriorityBadge = (priority?: string) => {
    const option = PRIORITY_OPTIONS.find(p => p.value === priority);
    if (!option) return null;
    return (
      <Badge variant="outline" className={cn("text-xs", option.color)}>
        {option.label.split(' ')[0]}
      </Badge>
    );
  };

  const getTotalCost = () => {
    return actions.reduce((sum, action) => sum + (action.estimatedCost || 0), 0);
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* Header with summary */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Label className="text-base font-semibold">Recommended Actions</Label>
          <Badge variant="secondary" className="text-xs">
            {actions.filter(a => a.description.trim()).length} action{actions.filter(a => a.description.trim()).length !== 1 ? 's' : ''}
          </Badge>
        </div>
        {getTotalCost() > 0 && (
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <DollarSign className="w-4 h-4" />
            Total: ${getTotalCost().toLocaleString()}
          </div>
        )}
      </div>

      {/* Actions list */}
      <div className="space-y-2">
        {actions.map((action, index) => (
          <Card
            key={index}
            className={cn(
              "transition-all",
              dragOverIndex === index && "ring-2 ring-primary ring-offset-2",
              draggedIndex === index && "opacity-50"
            )}
          >
            <Collapsible open={expandedActions.has(index)} onOpenChange={() => toggleExpanded(index)}>
              <CardHeader className="p-3">
                <div className="flex items-center gap-2">
                  {/* Drag handle */}
                  <div
                    draggable={!disabled}
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, index)}
                    onDragEnd={handleDragEnd}
                    className={cn(
                      "cursor-grab active:cursor-grabbing p-1 rounded hover:bg-muted",
                      disabled && "cursor-not-allowed opacity-50"
                    )}
                  >
                    <GripVertical className="w-4 h-4 text-muted-foreground" />
                  </div>

                  {/* Expand/collapse trigger */}
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="p-1 h-auto">
                      {expandedActions.has(index) ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </Button>
                  </CollapsibleTrigger>

                  {/* Action number and summary */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">Action {index + 1}</span>
                      {getPriorityBadge(action.priority)}
                      {action.estimatedCost && action.estimatedCost > 0 && (
                        <Badge variant="outline" className="text-xs">
                          ${action.estimatedCost.toLocaleString()}
                        </Badge>
                      )}
                    </div>
                    {!expandedActions.has(index) && action.description && (
                      <p className="text-sm text-muted-foreground truncate mt-0.5">
                        {action.description}
                      </p>
                    )}
                  </div>

                  {/* Delete button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveAction(index)}
                    disabled={disabled}
                    className="p-1 h-auto text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>

              <CollapsibleContent>
                <CardContent className="p-3 pt-0 space-y-4">
                  {/* Description */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor={`action-desc-${index}`} className="text-sm">
                        Description <span className="text-red-500">*</span>
                      </Label>
                      <VoiceInputButton
                        onTranscriptionComplete={(text) => {
                          const currentDesc = action.description || '';
                          const separator = currentDesc.trim() ? ' ' : '';
                          handleUpdateAction(index, 'description', currentDesc + separator + text);
                        }}
                        disabled={disabled}
                      />
                    </div>
                    <Textarea
                      id={`action-desc-${index}`}
                      value={action.description}
                      onChange={(e) => handleUpdateAction(index, 'description', e.target.value)}
                      placeholder="Describe the recommended action in detail..."
                      rows={2}
                      disabled={disabled}
                      className="resize-none"
                    />
                  </div>

                  {/* Priority */}
                  <div className="grid grid-cols-1 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor={`action-priority-${index}`} className="text-sm">Priority</Label>
                      <Select
                        value={action.priority || 'medium_term'}
                        onValueChange={(value) => handleUpdateAction(index, 'priority', value)}
                        disabled={disabled}
                      >
                        <SelectTrigger id={`action-priority-${index}`}>
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                        <SelectContent>
                          {PRIORITY_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              <div className="flex items-center gap-2">
                                <div className={cn("w-2 h-2 rounded-full", option.color.split(' ')[0])} />
                                {option.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="hidden space-y-2">
                      <Label htmlFor={`action-timeline-${index}`} className="text-sm">Timeline</Label>
                      <Select
                        value={action.timeline || '1-3 years'}
                        onValueChange={(value) => handleUpdateAction(index, 'timeline', value)}
                        disabled={disabled}
                      >
                        <SelectTrigger id={`action-timeline-${index}`}>
                          <SelectValue placeholder="Select timeline" />
                        </SelectTrigger>
                        <SelectContent>
                          {TIMELINE_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Cost and Confidence */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor={`action-cost-${index}`} className="text-sm">Estimated Cost ($)</Label>
                      <CurrencyInput
                        id={`action-cost-${index}`}
                        value={action.estimatedCost?.toString() || ''}
                        onChange={(value) => handleUpdateAction(index, 'estimatedCost', value ? parseFloat(value) : undefined)}
                        placeholder="0.00"
                        disabled={disabled}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`action-confidence-${index}`} className="text-sm">
                        Cost Confidence (%)
                      </Label>
                      <Input
                        id={`action-confidence-${index}`}
                        type="number"
                        min={0}
                        max={100}
                        value={action.confidence || ''}
                        onChange={(e) => handleUpdateAction(index, 'confidence', e.target.value ? parseInt(e.target.value) : undefined)}
                        placeholder="e.g., 80"
                        disabled={disabled}
                      />
                    </div>
                  </div>

                  {/* Consequence of Deferral */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      <Label htmlFor={`action-consequence-${index}`} className="text-sm">
                        Consequence of Deferral
                      </Label>
                    </div>
                    <Textarea
                      id={`action-consequence-${index}`}
                      value={action.consequenceOfDeferral || ''}
                      onChange={(e) => handleUpdateAction(index, 'consequenceOfDeferral', e.target.value)}
                      placeholder="What happens if this action is delayed or not performed?"
                      rows={2}
                      disabled={disabled}
                      className="resize-none"
                    />
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        ))}
      </div>

      {/* Add action buttons */}
      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddAction}
          disabled={disabled}
          className="gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Another Action
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowTemplatesDialog(true)}
          disabled={disabled}
          className="gap-2"
        >
          <Library className="w-4 h-4" />
          Use Template
        </Button>
      </div>

      {/* Action Templates Dialog */}
      <ActionTemplatesDialog
        open={showTemplatesDialog}
        onClose={() => setShowTemplatesDialog(false)}
        onSelectTemplate={handleSelectTemplate}
        uniformatCode={uniformatCode}
      />

      {/* Summary footer */}
      {actions.length > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground pt-2 border-t">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {actions.filter(a => a.priority === 'immediate').length} immediate
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {actions.filter(a => a.priority === 'short_term').length} short-term
            </span>
          </div>
          <span className="font-medium">
            Total: ${getTotalCost().toLocaleString()}
          </span>
        </div>
      )}
    </div>
  );
}

export default AssessmentActionsEditor;
