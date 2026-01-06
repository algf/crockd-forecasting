"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Header } from "@/components/layout";
import { PageContainer, PageContent } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDate, cn } from "@/lib/utils";
import {
  Plus,
  MoreHorizontal,
  Copy,
  Trash2,
  Edit,
  Eye,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";

interface Scenario {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  isBase: boolean;
  color: string;
  createdAt: string;
  updatedAt: string;
}

// Mock scenarios
const mockScenarios: Scenario[] = [
  {
    id: "1",
    name: "Base Case",
    description: "Conservative growth assumptions based on current trends",
    isActive: true,
    isBase: true,
    color: "#365584",
    createdAt: "2024-01-01",
    updatedAt: "2024-01-15",
  },
  {
    id: "2",
    name: "Upside",
    description: "Optimistic scenario with 20% growth target",
    isActive: true,
    isBase: false,
    color: "#10b981",
    createdAt: "2024-01-05",
    updatedAt: "2024-01-14",
  },
  {
    id: "3",
    name: "Downside",
    description: "Conservative scenario with reduced revenue",
    isActive: true,
    isBase: false,
    color: "#f43f5e",
    createdAt: "2024-01-05",
    updatedAt: "2024-01-12",
  },
];

const scenarioIcons: Record<string, React.ElementType> = {
  "1": Minus,
  "2": TrendingUp,
  "3": TrendingDown,
};

export default function ScenariosPage() {
  const [scenarios, setScenarios] = useState<Scenario[]>(mockScenarios);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newScenario, setNewScenario] = useState({ name: "", description: "" });

  const handleCreateScenario = () => {
    if (!newScenario.name) return;

    const scenario: Scenario = {
      id: String(Date.now()),
      name: newScenario.name,
      description: newScenario.description,
      isActive: false,
      isBase: false,
      color: "#64748b",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setScenarios([...scenarios, scenario]);
    setNewScenario({ name: "", description: "" });
    setIsCreateDialogOpen(false);
  };

  const handleDuplicate = (scenario: Scenario) => {
    const duplicate: Scenario = {
      ...scenario,
      id: String(Date.now()),
      name: `${scenario.name} (Copy)`,
      isBase: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setScenarios([...scenarios, duplicate]);
  };

  const handleDelete = (id: string) => {
    if (!confirm("Are you sure you want to delete this scenario?")) return;
    setScenarios(scenarios.filter((s) => s.id !== id));
  };

  const toggleActive = (id: string) => {
    setScenarios(
      scenarios.map((s) =>
        s.id === id ? { ...s, isActive: !s.isActive } : s
      )
    );
  };

  return (
    <PageContainer>
      <Header
        title="Scenarios"
        description="Manage your forecast scenarios"
        actions={
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Scenario
          </Button>
        }
      />
      <PageContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {scenarios.map((scenario) => {
            const Icon = scenarioIcons[scenario.id] || Minus;
            return (
              <Card
                key={scenario.id}
                className={cn(
                  "relative overflow-hidden transition-all hover:shadow-md",
                  scenario.isActive && "ring-2 ring-primary-500"
                )}
              >
                <div
                  className="absolute top-0 left-0 w-1 h-full"
                  style={{ backgroundColor: scenario.color }}
                />
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${scenario.color}15` }}
                      >
                        <Icon
                          className="h-5 w-5"
                          style={{ color: scenario.color }}
                        />
                      </div>
                      <div>
                        <CardTitle className="text-base flex items-center gap-2">
                          {scenario.name}
                          {scenario.isBase && (
                            <Badge variant="default" className="text-xs">
                              Base
                            </Badge>
                          )}
                        </CardTitle>
                        <CardDescription className="text-xs">
                          Updated {formatDate(new Date(scenario.updatedAt))}
                        </CardDescription>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon-sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-neutral-600 mb-4 line-clamp-2">
                    {scenario.description}
                  </p>

                  <div className="flex items-center gap-2">
                    <Badge
                      variant={scenario.isActive ? "success" : "secondary"}
                      className="cursor-pointer"
                      onClick={() => toggleActive(scenario.id)}
                    >
                      {scenario.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2 mt-4 pt-4 border-t border-neutral-100">
                    <Link href={`/forecasts/scenarios/${scenario.id}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full">
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Button>
                    </Link>
                    <Link href={`/forecasts/assumptions?scenario=${scenario.id}`}>
                      <Button variant="outline" size="icon-sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="icon-sm"
                      onClick={() => handleDuplicate(scenario)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    {!scenario.isBase && (
                      <Button
                        variant="outline"
                        size="icon-sm"
                        onClick={() => handleDelete(scenario.id)}
                      >
                        <Trash2 className="h-4 w-4 text-error-500" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {/* Add New Scenario Card */}
          <Card
            className="border-dashed cursor-pointer hover:border-primary-300 hover:bg-primary-50/50 transition-colors"
            onClick={() => setIsCreateDialogOpen(true)}
          >
            <CardContent className="flex flex-col items-center justify-center h-full min-h-[200px]">
              <div className="w-12 h-12 rounded-full bg-primary-50 flex items-center justify-center mb-3">
                <Plus className="h-6 w-6 text-primary-600" />
              </div>
              <p className="text-sm font-medium text-neutral-900">Create New Scenario</p>
              <p className="text-xs text-neutral-500 mt-1">
                Clone from base or start fresh
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Create Scenario Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Scenario</DialogTitle>
              <DialogDescription>
                Create a new forecast scenario. You can clone from an existing scenario or start fresh.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Scenario Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Q2 Growth Plan"
                  value={newScenario.name}
                  onChange={(e) => setNewScenario({ ...newScenario, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  placeholder="Brief description of this scenario"
                  value={newScenario.description}
                  onChange={(e) => setNewScenario({ ...newScenario, description: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateScenario} disabled={!newScenario.name}>
                Create Scenario
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PageContent>
    </PageContainer>
  );
}
