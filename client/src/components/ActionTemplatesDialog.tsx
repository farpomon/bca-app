import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, X, DollarSign, AlertTriangle, TrendingUp } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface ActionTemplatesDialogProps {
  open: boolean;
  onClose: () => void;
  onSelectTemplate: (template: any) => void;
  uniformatCode?: string | null;
}

const priorityColors = {
  immediate: "bg-red-100 text-red-800 border-red-300",
  short_term: "bg-orange-100 text-orange-800 border-orange-300",
  medium_term: "bg-yellow-100 text-yellow-800 border-yellow-300",
  long_term: "bg-blue-100 text-blue-800 border-blue-300",
};

const priorityLabels = {
  immediate: "Immediate (0-1 years)",
  short_term: "Short Term (1-3 years)",
  medium_term: "Medium Term (3-5 years)",
  long_term: "Long Term (5+ years)",
};

export function ActionTemplatesDialog({
  open,
  onClose,
  onSelectTemplate,
  uniformatCode,
}: ActionTemplatesDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Fetch all templates
  const { data: allTemplates = [], isLoading } = trpc.actionTemplates.getAll.useQuery(undefined, {
    enabled: open,
  });

  // Fetch templates by UNIFORMAT code if provided
  const { data: uniformatTemplates = [] } = trpc.actionTemplates.getByUniformatCode.useQuery(
    { uniformatCode: uniformatCode || "" },
    { enabled: open && !!uniformatCode }
  );

  // Get unique categories
  const categories = [...new Set(allTemplates.map((t) => t.category))].sort();

  // Filter templates based on search and category
  const filteredTemplates = allTemplates.filter((template) => {
    const matchesSearch =
      searchQuery === "" ||
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.category.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = !selectedCategory || template.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  // Group templates by category
  const templatesByCategory = filteredTemplates.reduce((acc, template) => {
    if (!acc[template.category]) {
      acc[template.category] = [];
    }
    acc[template.category].push(template);
    return acc;
  }, {} as Record<string, typeof allTemplates>);

  const handleSelectTemplate = (template: any) => {
    onSelectTemplate(template);
    onClose();
    toast.success(`Template "${template.name}" applied`);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl">Action Templates Library</DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Select a pre-defined template for common repairs and maintenance actions
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Show recommended templates if UNIFORMAT code is provided */}
          {uniformatCode && uniformatTemplates.length > 0 && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 text-sm font-medium text-blue-900">
                <TrendingUp className="h-4 w-4" />
                Recommended for {uniformatCode}
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {uniformatTemplates.slice(0, 3).map((template) => (
                  <Badge
                    key={template.id}
                    variant="outline"
                    className="cursor-pointer hover:bg-blue-100"
                    onClick={() => handleSelectTemplate(template)}
                  >
                    {template.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Search and filters */}
          <div className="flex gap-3 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search templates by name, description, or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Category filters */}
          <div className="flex flex-wrap gap-2 mt-3">
            <Button
              variant={selectedCategory === null ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(null)}
            >
              All Categories
            </Button>
            {categories.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </Button>
            ))}
          </div>
        </DialogHeader>

        {/* Templates list */}
        <ScrollArea className="flex-1 px-6 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-muted-foreground">Loading templates...</div>
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="text-muted-foreground">No templates found</div>
              <Button variant="link" onClick={() => { setSearchQuery(""); setSelectedCategory(null); }}>
                Clear filters
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(templatesByCategory).map(([category, templates]) => (
                <div key={category}>
                  <h3 className="text-lg font-semibold mb-3">{category}</h3>
                  <div className="space-y-3">
                    {templates.map((template) => (
                      <div
                        key={template.id}
                        className="p-4 border rounded-lg hover:border-primary hover:shadow-md transition-all cursor-pointer"
                        onClick={() => handleSelectTemplate(template)}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-semibold">{template.name}</h4>
                              <Badge
                                variant="outline"
                                className={priorityColors[template.priority as keyof typeof priorityColors]}
                              >
                                {priorityLabels[template.priority as keyof typeof priorityLabels]}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-3">{template.description}</p>

                            <div className="flex flex-wrap gap-4 text-sm">
                              {template.estimatedCost && (
                                <div className="flex items-center gap-1">
                                  <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                                  <span className="font-medium">
                                    ${parseFloat(template.estimatedCost).toLocaleString()}
                                  </span>
                                  {template.confidence && (
                                    <span className="text-muted-foreground">
                                      ({template.confidence}% confidence)
                                    </span>
                                  )}
                                </div>
                              )}
                              {template.timeline && (
                                <div className="text-muted-foreground">
                                  Timeline: {template.timeline}
                                </div>
                              )}
                            </div>

                            {template.consequenceOfDeferral && (
                              <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded text-xs">
                                <div className="flex items-start gap-2">
                                  <AlertTriangle className="h-3.5 w-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                                  <div>
                                    <span className="font-medium text-amber-900">Consequence of Deferral: </span>
                                    <span className="text-amber-800">{template.consequenceOfDeferral}</span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex-shrink-0 bg-muted/30">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div>
              Showing {filteredTemplates.length} of {allTemplates.length} templates
            </div>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
