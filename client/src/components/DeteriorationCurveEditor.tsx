import { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

interface CurveParameters {
  param1: number;
  param2: number;
  param3: number;
  param4: number;
  param5: number;
  param6: number;
}

interface DeteriorationCurveEditorProps {
  projectId: number;
  componentCode: string;
  currentCondition?: number;
  currentAge?: number;
  onSave?: () => void;
}

const DEFAULT_CURVES: Record<string, { best: CurveParameters; design: CurveParameters; worst: CurveParameters }> = {
  B30: {
    best: { param1: 100, param2: 95, param3: 90, param4: 85, param5: 80, param6: 75 },
    design: { param1: 100, param2: 90, param3: 80, param4: 70, param5: 60, param6: 50 },
    worst: { param1: 100, param2: 85, param3: 70, param4: 55, param5: 40, param6: 25 },
  },
  B20: {
    best: { param1: 100, param2: 93, param3: 86, param4: 79, param5: 72, param6: 65 },
    design: { param1: 100, param2: 88, param3: 76, param4: 64, param5: 52, param6: 40 },
    worst: { param1: 100, param2: 82, param3: 64, param4: 46, param5: 28, param6: 10 },
  },
  D30: {
    best: { param1: 100, param2: 96, param3: 92, param4: 88, param5: 84, param6: 80 },
    design: { param1: 100, param2: 92, param3: 84, param4: 76, param5: 68, param6: 60 },
    worst: { param1: 100, param2: 87, param3: 74, param4: 61, param5: 48, param6: 35 },
  },
  D20: {
    best: { param1: 100, param2: 94, param3: 88, param4: 82, param5: 76, param6: 70 },
    design: { param1: 100, param2: 89, param3: 78, param4: 67, param5: 56, param6: 45 },
    worst: { param1: 100, param2: 83, param3: 66, param4: 49, param5: 32, param6: 15 },
  },
  D50: {
    best: { param1: 100, param2: 97, param3: 94, param4: 91, param5: 88, param6: 85 },
    design: { param1: 100, param2: 94, param3: 88, param4: 82, param5: 76, param6: 70 },
    worst: { param1: 100, param2: 90, param3: 80, param4: 70, param5: 60, param6: 50 },
  },
};

export function DeteriorationCurveEditor({
  projectId,
  componentCode,
  currentCondition,
  currentAge,
  onSave,
}: DeteriorationCurveEditorProps) {
  const [curveType, setCurveType] = useState<"best" | "design" | "worst">("design");
  const [interpolation, setInterpolation] = useState<"linear" | "polynomial" | "exponential">("linear");
  const [template, setTemplate] = useState<string>("B30");
  const [parameters, setParameters] = useState<CurveParameters>(DEFAULT_CURVES.B30.design);
  const [prediction, setPrediction] = useState<any>(null);

  const createCurveMutation = trpc.predictions.createCurve.useMutation();
  const predictionQuery = trpc.predictions.component.useQuery(
    {
      projectId,
      componentCode,
      method: "curve",
    },
    { enabled: false }
  );

  // Generate chart data from parameters
  const generateChartData = () => {
    const data: any[] = [];
    const years = [0, 5, 10, 15, 20, 25];
    const params = [parameters.param1, parameters.param2, parameters.param3, parameters.param4, parameters.param5, parameters.param6];

    for (let year = 0; year <= 30; year++) {
      let condition = 100;

      if (year <= 25) {
        // Find surrounding points for interpolation
        const lowerIndex = Math.floor(year / 5);
        const upperIndex = Math.min(lowerIndex + 1, 5);
        const lowerYear = years[lowerIndex];
        const upperYear = years[upperIndex];
        const lowerCondition = params[lowerIndex];
        const upperCondition = params[upperIndex];

        if (interpolation === "linear") {
          const t = (year - lowerYear) / (upperYear - lowerYear);
          condition = lowerCondition + t * (upperCondition - lowerCondition);
        } else if (interpolation === "exponential") {
          const t = (year - lowerYear) / (upperYear - lowerYear);
          condition = lowerCondition * Math.pow(upperCondition / lowerCondition, t);
        } else {
          // Polynomial (simplified)
          const t = (year - lowerYear) / (upperYear - lowerYear);
          condition = lowerCondition + t * (upperCondition - lowerCondition);
        }
      } else {
        // Extrapolate beyond year 25
        const slope = (params[5] - params[4]) / 5;
        condition = params[5] + slope * (year - 25);
      }

      data.push({
        year,
        condition: Math.max(0, Math.min(100, condition)),
      });
    }

    return data;
  };

  const chartData = generateChartData();

  const handleParameterChange = (param: keyof CurveParameters, value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= 0 && numValue <= 100) {
      setParameters((prev) => ({ ...prev, [param]: numValue }));
    }
  };

  const handleTemplateChange = (templateName: string) => {
    setTemplate(templateName);
    setParameters(DEFAULT_CURVES[templateName][curveType]);
  };

  const handleCurveTypeChange = (type: "best" | "design" | "worst") => {
    setCurveType(type);
    setParameters(DEFAULT_CURVES[template][type]);
  };

  const handleReset = () => {
    setParameters(DEFAULT_CURVES[template][curveType]);
    toast.success("Parameters reset to default");
  };

  const handleSave = async () => {
    try {
      await createCurveMutation.mutateAsync({
        name: `${componentCode}_${curveType}_${Date.now()}`,
        componentType: componentCode,
        curveType,
        interpolationType: interpolation,
        ...parameters,
      });
      toast.success("Custom curve saved successfully");
      onSave?.();
    } catch (error) {
      toast.error("Failed to save curve");
    }
  };

  const handleRunPrediction = async () => {
    try {
      const result = await predictionQuery.refetch();
      setPrediction(result.data);
      toast.success("Prediction updated");
    } catch (error) {
      toast.error("Failed to run prediction");
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Deterioration Curve Editor</CardTitle>
          <CardDescription>
            Configure Best/Design/Worst case scenarios with 6 parameters (years 0-25)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Controls */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Curve Template</Label>
              <Select value={template} onValueChange={handleTemplateChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="B30">B30 - Exterior Enclosure (30yr)</SelectItem>
                  <SelectItem value="B20">B20 - Exterior Enclosure (20yr)</SelectItem>
                  <SelectItem value="D30">D30 - Services (30yr)</SelectItem>
                  <SelectItem value="D20">D20 - Services (20yr)</SelectItem>
                  <SelectItem value="D50">D50 - Services (50yr)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Interpolation Method</Label>
              <Select value={interpolation} onValueChange={(v: any) => setInterpolation(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="linear">Linear</SelectItem>
                  <SelectItem value="polynomial">Polynomial</SelectItem>
                  <SelectItem value="exponential">Exponential</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Actions</Label>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleReset} className="flex-1">
                  Reset
                </Button>
                <Button size="sm" onClick={handleSave} className="flex-1">
                  Save
                </Button>
              </div>
            </div>
          </div>

          {/* Curve Type Tabs */}
          <Tabs value={curveType} onValueChange={(v: any) => handleCurveTypeChange(v)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="best">Best Case</TabsTrigger>
              <TabsTrigger value="design">Design Case</TabsTrigger>
              <TabsTrigger value="worst">Worst Case</TabsTrigger>
            </TabsList>

            <TabsContent value={curveType} className="space-y-4">
              {/* Parameter Inputs */}
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                {(["param1", "param2", "param3", "param4", "param5", "param6"] as const).map((param, index) => (
                  <div key={param} className="space-y-2">
                    <Label>Year {index * 5}</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={parameters[param]}
                      onChange={(e) => handleParameterChange(param, e.target.value)}
                    />
                  </div>
                ))}
              </div>

              {/* Chart */}
              <div className="h-96 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="year" label={{ value: "Years", position: "insideBottom", offset: -5 }} />
                    <YAxis label={{ value: "Condition (%)", angle: -90, position: "insideLeft" }} domain={[0, 100]} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="condition" stroke="#8884d8" strokeWidth={2} name={`${curveType} Case`} />
                    {currentAge !== undefined && (
                      <ReferenceLine x={currentAge} stroke="red" strokeDasharray="3 3" label="Current Age" />
                    )}
                    {currentCondition !== undefined && (
                      <ReferenceLine y={currentCondition} stroke="green" strokeDasharray="3 3" label="Current Condition" />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </TabsContent>
          </Tabs>

          {/* Prediction Results */}
          <div className="space-y-4">
            <Button onClick={handleRunPrediction} disabled={predictionQuery.isFetching}>
              {predictionQuery.isFetching ? "Running Prediction..." : "Run Prediction"}
            </Button>

            {prediction && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Predicted Failure Year</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{prediction.predictedFailureYear || "N/A"}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Remaining Life</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{prediction.remainingLife || "N/A"} years</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Risk Level</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Badge
                      variant={
                        prediction.riskLevel === "critical"
                          ? "destructive"
                          : prediction.riskLevel === "high"
                            ? "default"
                            : prediction.riskLevel === "medium"
                              ? "secondary"
                              : "outline"
                      }
                    >
                      {prediction.riskLevel || "N/A"}
                    </Badge>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Confidence Score</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{prediction.confidenceScore ? `${(prediction.confidenceScore * 100).toFixed(0)}%` : "N/A"}</div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
