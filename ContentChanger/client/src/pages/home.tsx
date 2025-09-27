import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { SmartReplaceRequest, SmartReplaceResponse, BatchReplaceRequest } from "@shared/schema";
import { 
  Loader2, Settings, FileText, Eye, CheckCircle, BarChart3, Shield, 
  ArrowRightLeft, Plus, Trash2, Copy, Download, Undo2, Cloud, Database, 
  RefreshCw, Moon, Sun, Zap, Target, TrendingUp, AlertCircle, 
  CheckCircle2, XCircle, ExternalLink, Save, History, Palette
} from "lucide-react";

interface BatchOperation {
  id: string;
  findText: string;
  replaceText: string;
  isEnabled: boolean;
}

export default function Home() {
  // Core states
  const [findText, setFindText] = useState("");
  const [replaceText, setReplaceText] = useState("");
  const [originalContent, setOriginalContent] = useState("");
  const [result, setResult] = useState<SmartReplaceResponse | null>(null);
  
  // UI states
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [isDryRun, setIsDryRun] = useState(false);
  const [originalContentBackup, setOriginalContentBackup] = useState("");
  
  // Batch operation states
  const [batchOperations, setBatchOperations] = useState<BatchOperation[]>([
    { id: "1", findText: "", replaceText: "", isEnabled: true }
  ]);
  const [applyBrandkitRules, setApplyBrandkitRules] = useState(true);
  const [preserveFormatting, setPreserveFormatting] = useState(true);
  
  // Contentstack states
  const [contentstackConfig, setContentstackConfig] = useState({
    apiKey: "",
    deliveryToken: "",
    environment: "",
    entryUid: ""
  });
  const [isLoadingFromContentstack, setIsLoadingFromContentstack] = useState(false);
  
  const { toast } = useToast();

  // Contentstack integration function
  const loadFromContentstack = async () => {
    if (!contentstackConfig.apiKey || !contentstackConfig.deliveryToken || 
        !contentstackConfig.environment || !contentstackConfig.entryUid) {
      toast({
        title: "Configuration Error",
        description: "Please fill in all Contentstack configuration fields.",
        variant: "destructive",
      });
      return;
    }

    setIsLoadingFromContentstack(true);
    try {
      const response = await apiRequest("POST", "/api/contentstack/load", contentstackConfig);
      const data = await response.json();
      
      if (data.success) {
        setOriginalContent(data.content);
        setOriginalContentBackup(data.content);
        
        toast({
          title: "Content Loaded",
          description: "Content successfully loaded from Contentstack.",
        });
      } else {
        throw new Error(data.message || "Failed to load content");
      }
    } catch (error) {
      toast({
        title: "Contentstack Error",
        description: error instanceof Error ? error.message : "Failed to load content from Contentstack.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingFromContentstack(false);
    }
  };

  // Revert function
  const revertToOriginal = () => {
    if (originalContentBackup) {
      setOriginalContent(originalContentBackup);
      setResult(null);
      toast({
        title: "Content Reverted",
        description: "Content has been restored to the original version.",
      });
    }
  };

  const smartReplaceMutation = useMutation({
    mutationFn: async (data: SmartReplaceRequest) => {
      const response = await apiRequest("POST", "/api/smart-replace", data);
      return response.json() as Promise<SmartReplaceResponse>;
    },
    onSuccess: (data) => {
      setResult(data);
      toast({
        title: "Smart Replace Complete",
        description: `Successfully processed content with ${data.statistics.replacements} replacements.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    },
  });

  const batchReplaceMutation = useMutation({
    mutationFn: async (data: BatchReplaceRequest) => {
      const response = await apiRequest("POST", "/api/batch-replace", data);
      return response.json() as Promise<SmartReplaceResponse>;
    },
    onSuccess: (data) => {
      setResult(data);
      toast({
        title: "Batch Replace Complete",
        description: `Successfully processed content with ${data.statistics.replacements} total replacements.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    },
  });

  const handleSmartReplace = () => {
    if (!findText.trim() || !replaceText.trim() || !originalContent.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill in all fields before running smart replace.",
        variant: "destructive",
      });
      return;
    }

    // Store backup if not already stored
    if (!originalContentBackup) {
      setOriginalContentBackup(originalContent);
    }

    if (isDryRun) {
      // Use the new dry run API endpoint
      handleDryRun();
    } else {
      smartReplaceMutation.mutate({
        findText: findText.trim(),
        replaceText: replaceText.trim(),
        originalContent: originalContent.trim(),
      });
    }
  };

  const handleDryRun = async () => {
    try {
      const response = await apiRequest("POST", "/api/dry-run", {
        findText: findText.trim(),
        replaceText: replaceText.trim(),
        originalContent: originalContent.trim(),
        brandkitRules: [] // You can add brandkit rules here
      });
      
      const result = await response.json();
      setResult(result);
      
      toast({
        title: "Dry Run Preview",
        description: "Changes are highlighted with << >> markers. Uncheck Dry Run to apply changes.",
      });
    } catch (error) {
      toast({
        title: "Dry Run Error",
        description: error instanceof Error ? error.message : "Failed to process dry run.",
        variant: "destructive",
      });
    }
  };

  // Batch operation management functions
  const addBatchOperation = () => {
    const newId = Date.now().toString();
    setBatchOperations([...batchOperations, { 
      id: newId, 
      findText: "", 
      replaceText: "", 
      isEnabled: true 
    }]);
  };

  const removeBatchOperation = (id: string) => {
    if (batchOperations.length > 1) {
      setBatchOperations(batchOperations.filter(op => op.id !== id));
    }
  };

  const updateBatchOperation = (id: string, field: keyof BatchOperation, value: string | boolean) => {
    setBatchOperations(batchOperations.map(op => 
      op.id === id ? { ...op, [field]: value } : op
    ));
  };

  const handleBatchReplace = () => {
    const enabledOperations = batchOperations.filter(op => op.isEnabled && op.findText.trim() && op.replaceText.trim());
    
    if (enabledOperations.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please add at least one enabled operation with valid find and replace text.",
        variant: "destructive",
      });
      return;
    }

    if (!originalContent.trim()) {
      toast({
        title: "Validation Error",
        description: "Please provide content to process.",
        variant: "destructive",
      });
      return;
    }

    batchReplaceMutation.mutate({
      operations: enabledOperations.map(op => ({
        findText: op.findText.trim(),
        replaceText: op.replaceText.trim(),
        isEnabled: op.isEnabled
      })),
      originalContent: originalContent.trim(),
      applyBrandkitRules,
      preserveFormatting
    });
  };

  const exportResults = () => {
    if (!result) return;
    
    const exportData = {
      processedContent: result.processedContent,
      statistics: result.statistics,
      timestamp: new Date().toISOString(),
      mode: isBatchMode ? 'batch' : 'single'
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `smart-replace-results-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = async () => {
    if (!result?.processedContent) return;
    
    try {
      await navigator.clipboard.writeText(result.processedContent);
      toast({
        title: "Copied!",
        description: "Processed content copied to clipboard.",
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Unable to copy to clipboard.",
        variant: "destructive",
      });
    }
  };

  const renderHighlightedContent = (content: string) => {
    if (!result) {
      return <div className="text-muted-foreground italic">Processed content will appear here...</div>;
    }
    
    // Handle dry run highlighting with << >> markers
    if (isDryRun) {
      const escapedContent = content.replace(/[&<>"']/g, (match) => {
        const escapeMap: Record<string, string> = {
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#39;'
        };
        return escapeMap[match];
      });
      
      // Split by << >> markers for dry run highlighting
      const parts = escapedContent.split(/(<<[^>]*>>)/g);
      
      return (
        <div>
          {parts.map((part, index) => {
            const isDryRunHighlight = part.startsWith('<<') && part.endsWith('>>');
            return isDryRunHighlight ? (
              <span key={index} className="bg-orange-200 dark:bg-orange-800 px-1 rounded font-semibold">
                {part}
              </span>
            ) : (
              <span key={index}>{part}</span>
            );
          })}
        </div>
      );
    }
    
    // Regular highlighting for applied changes
    if (!replaceText) {
      return <div className="text-muted-foreground italic">Processed content will appear here...</div>;
    }
    
    // Escape HTML and split by replacement text for safe highlighting
    const escapedContent = content.replace(/[&<>"']/g, (match) => {
      const escapeMap: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      };
      return escapeMap[match];
    });
    
    // Split content by replacement text for highlighting
    const regex = new RegExp(`(${replaceText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = escapedContent.split(regex);
    
    return (
      <div>
        {parts.map((part, index) => {
          const isHighlight = new RegExp(`^${replaceText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i').test(part);
          return isHighlight ? (
            <span key={index} className="bg-yellow-200 dark:bg-yellow-800 px-1 rounded">
              {part}
            </span>
          ) : (
            <span key={index}>{part}</span>
          );
        })}
      </div>
    );
  };

  return (
    <div className={`min-h-screen transition-colors ${isDarkMode ? 'dark bg-gray-900' : 'bg-gray-50'}`}>
      {/* Top Navigation */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg shadow-lg">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">ContextAI</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">AI-Powered Content Management</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </Button>
              
              <Badge variant="outline" className="text-xs">
                <Target className="w-3 h-3 mr-1" />
                Professional
              </Badge>
            </div>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex h-[calc(100vh-4rem)]">
        {/* Sidebar */}
        <aside className="w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Action Toolbar */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center">
                  <Zap className="w-4 h-4 mr-2 text-blue-500" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium">Dry Run Mode</Label>
                  <Switch
                    checked={isDryRun}
                    onCheckedChange={setIsDryRun}
                    className="data-[state=checked]:bg-orange-500"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium">Batch Mode</Label>
                  <Switch
                    checked={isBatchMode}
                    onCheckedChange={setIsBatchMode}
                    className="data-[state=checked]:bg-purple-500"
                  />
                </div>
                
                <Separator />
                
                <div className="space-y-2">
                  <Button
                    onClick={handleSmartReplace}
                    disabled={smartReplaceMutation.isPending}
                    className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                    size="sm"
                  >
                    {smartReplaceMutation.isPending ? (
                      <>
                        <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <ArrowRightLeft className="w-3 h-3 mr-2" />
                        {isDryRun ? "Preview Changes" : "Run Smart Replace"}
                      </>
                    )}
                  </Button>
                  
                  {originalContentBackup && (
                    <Button
                      onClick={revertToOriginal}
                      variant="outline"
                      className="w-full"
                      size="sm"
                    >
                      <Undo2 className="w-3 h-3 mr-2" />
                      Revert
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Input Controls */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center">
                  <FileText className="w-4 h-4 mr-2 text-green-500" />
                  Find & Replace
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="find-input" className="text-xs font-medium">Find Text</Label>
                  <Input
                    id="find-input"
                    placeholder="Enter text to find..."
                    value={findText}
                    onChange={(e) => setFindText(e.target.value)}
                    className="text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="replace-input" className="text-xs font-medium">Replace With</Label>
                  <Input
                    id="replace-input"
                    placeholder="Enter replacement text..."
                    value={replaceText}
                    onChange={(e) => setReplaceText(e.target.value)}
                    className="text-sm"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Contentstack Integration */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center">
                  <Cloud className="w-4 h-4 mr-2 text-blue-500" />
                  Contentstack
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label className="text-xs font-medium">API Key</Label>
                  <Input
                    placeholder="Enter API Key"
                    value={contentstackConfig.apiKey}
                    onChange={(e) => setContentstackConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                    className="text-xs"
                    type="password"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Delivery Token</Label>
                  <Input
                    placeholder="Enter Delivery Token"
                    value={contentstackConfig.deliveryToken}
                    onChange={(e) => setContentstackConfig(prev => ({ ...prev, deliveryToken: e.target.value }))}
                    className="text-xs"
                    type="password"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Environment</Label>
                  <Input
                    placeholder="e.g., development"
                    value={contentstackConfig.environment}
                    onChange={(e) => setContentstackConfig(prev => ({ ...prev, environment: e.target.value }))}
                    className="text-xs"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Entry UID</Label>
                  <Input
                    placeholder="Enter Entry UID"
                    value={contentstackConfig.entryUid}
                    onChange={(e) => setContentstackConfig(prev => ({ ...prev, entryUid: e.target.value }))}
                    className="text-xs"
                  />
                </div>
                
                <Button
                  onClick={loadFromContentstack}
                  disabled={isLoadingFromContentstack}
                  className="w-full bg-blue-500 hover:bg-blue-600"
                  size="sm"
                >
                  {isLoadingFromContentstack ? (
                    <>
                      <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <Database className="w-3 h-3 mr-2" />
                      Load from Contentstack
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Content Input */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center">
                  <FileText className="w-4 h-4 mr-2 text-green-500" />
                  Content Input
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Paste your content here or load from Contentstack..."
                  value={originalContent}
                  onChange={(e) => setOriginalContent(e.target.value)}
                  className="min-h-[200px] resize-none font-mono text-sm leading-relaxed"
                />
              </CardContent>
            </Card>
          </div>

          {/* Before/After Panels */}
          <div className="flex-1 flex">
            {/* Before Panel */}
            <div className="flex-1 p-6 border-r border-gray-200 dark:border-gray-700">
              <Card className="h-full border-0 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center">
                    <Eye className="w-4 h-4 mr-2 text-gray-500" />
                    Before
                    <Badge variant="outline" className="ml-2 text-xs">Original</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-full">
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 h-full font-mono text-sm leading-relaxed overflow-y-auto">
                    {originalContent || (
                      <div className="text-gray-400 italic flex items-center justify-center h-full">
                        Original content will appear here...
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* After Panel */}
            <div className="flex-1 p-6">
              <Card className="h-full border-0 shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium flex items-center">
                      <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                      After
                      <Badge variant="outline" className="ml-2 text-xs bg-green-50 text-green-700 border-green-200">
                        Processed
                      </Badge>
                    </CardTitle>
                    {result && (
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={copyToClipboard}
                          className="text-xs"
                        >
                          <Copy className="w-3 h-3 mr-1" />
                          Copy
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={exportResults}
                          className="text-xs"
                        >
                          <Download className="w-3 h-3 mr-1" />
                          Export
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="h-full">
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 h-full font-mono text-sm leading-relaxed overflow-y-auto">
                    {result ? renderHighlightedContent(result.processedContent) : (
                      <div className="text-gray-400 italic flex items-center justify-center h-full">
                        Processed content will appear here...
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Analytics Summary */}
          {result && (
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center">
                    <TrendingUp className="w-4 h-4 mr-2 text-blue-500" />
                    Analytics Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-white dark:bg-gray-700 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">{result.statistics.replacements}</div>
                      <div className="text-xs text-gray-500">Replacements</div>
                    </div>
                    <div className="text-center p-3 bg-white dark:bg-gray-700 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{result.statistics.links}</div>
                      <div className="text-xs text-gray-500">Links Updated</div>
                    </div>
                    <div className="text-center p-3 bg-white dark:bg-gray-700 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">{result.statistics.emails}</div>
                      <div className="text-xs text-gray-500">Emails Updated</div>
                    </div>
                    <div className="text-center p-3 bg-white dark:bg-gray-700 rounded-lg">
                      <div className="text-2xl font-bold text-orange-600">{result.statistics.compliance}%</div>
                      <div className="text-xs text-gray-500">Brand Compliance</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
