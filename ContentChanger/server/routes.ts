import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  smartReplaceRequestSchema, 
  batchReplaceRequestSchema,
  brandkitRuleConfigSchema,
  batchOperationSchema
} from "@shared/schema";
import { performSmartReplace, performBatchReplace, performDryRun } from "./services/openai";
import { ZodError } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Smart Replace API endpoint
  app.post("/api/smart-replace", async (req, res) => {
    try {
      // Validate request body
      const validatedData = smartReplaceRequestSchema.parse(req.body);
      
      // Perform smart replace using OpenAI
      const result = await performSmartReplace({
        findText: validatedData.findText,
        replaceText: validatedData.replaceText,
        originalContent: validatedData.originalContent,
      });

      // Store in history
      await storage.createReplacementHistory({
        originalContent: validatedData.originalContent,
        processedContent: result.processedContent,
        operations: [{ findText: validatedData.findText, replaceText: validatedData.replaceText }],
        statistics: result.statistics,
        isBatch: false
      });
      
      res.json(result);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      } else if (error instanceof Error) {
        res.status(500).json({ 
          message: error.message 
        });
      } else {
        res.status(500).json({ 
          message: "An unexpected error occurred" 
        });
      }
    }
  });

  // Dry Run API endpoint
  app.post("/api/dry-run", async (req, res) => {
    try {
      const { findText, replaceText, originalContent, brandkitRules = [] } = req.body;
      
      if (!findText || !replaceText || !originalContent) {
        return res.status(400).json({ 
          message: "Missing required fields: findText, replaceText, originalContent" 
        });
      }

      const result = await performDryRun({
        findText,
        replaceText,
        originalContent,
        brandkitRules
      });
      
      res.json(result);
    } catch (error) {
      console.error('Dry Run Error:', error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Dry run processing failed" 
      });
    }
  });

  // Batch Replace API endpoint
  app.post("/api/batch-replace", async (req, res) => {
    try {
      const validatedData = batchReplaceRequestSchema.parse(req.body);
      
      // Get active brandkit rules if needed
      const brandkitRules = validatedData.applyBrandkitRules 
        ? await storage.getBrandkitRules() 
        : [];

      // Perform batch replace
      const result = await performBatchReplace({
        operations: validatedData.operations.filter(op => op.isEnabled),
        originalContent: validatedData.originalContent,
        brandkitRules,
        preserveFormatting: validatedData.preserveFormatting
      });

      // Store in history
      await storage.createReplacementHistory({
        originalContent: validatedData.originalContent,
        processedContent: result.processedContent,
        operations: validatedData.operations.map(op => ({ findText: op.findText, replaceText: op.replaceText })),
        statistics: result.statistics,
        isBatch: true
      });

      res.json(result);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      } else if (error instanceof Error) {
        res.status(500).json({ 
          message: error.message 
        });
      } else {
        res.status(500).json({ 
          message: "An unexpected error occurred" 
        });
      }
    }
  });

  // Brandkit Rules endpoints
  app.get("/api/brandkit-rules", async (req, res) => {
    try {
      const rules = await storage.getBrandkitRules();
      res.json(rules);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch brandkit rules" });
    }
  });

  app.post("/api/brandkit-rules", async (req, res) => {
    try {
      const validatedData = brandkitRuleConfigSchema.parse(req.body);
      const rule = await storage.createBrandkitRule(validatedData);
      res.json(rule);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      } else {
        res.status(500).json({ message: "Failed to create brandkit rule" });
      }
    }
  });

  app.delete("/api/brandkit-rules/:id", async (req, res) => {
    try {
      await storage.deleteBrandkitRule(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete brandkit rule" });
    }
  });

  // Batch Operations endpoints
  app.get("/api/batch-operations", async (req, res) => {
    try {
      const operations = await storage.getBatchOperations();
      res.json(operations);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch batch operations" });
    }
  });

  app.post("/api/batch-operations", async (req, res) => {
    try {
      const validatedData = batchOperationSchema.parse(req.body);
      const operation = await storage.createBatchOperation(validatedData);
      res.json(operation);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      } else {
        res.status(500).json({ message: "Failed to create batch operation" });
      }
    }
  });

  // Replacement History endpoints
  app.get("/api/replacement-history", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const history = await storage.getReplacementHistory(limit);
      res.json(history);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch replacement history" });
    }
  });

  app.delete("/api/replacement-history/:id", async (req, res) => {
    try {
      await storage.deleteReplacementHistory(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete history item" });
    }
  });

  // Contentstack Integration endpoint with detailed error handling
  app.post("/api/contentstack/load", async (req, res) => {
    try {
      const { apiKey, deliveryToken, environment, entryUid } = req.body;
      
      console.log('🔍 Contentstack Request:', { 
        apiKey: apiKey ? `${apiKey.substring(0, 8)}...` : 'Missing',
        deliveryToken: deliveryToken ? `${deliveryToken.substring(0, 8)}...` : 'Missing',
        environment,
        entryUid 
      });
      
      if (!apiKey || !deliveryToken || !environment || !entryUid) {
        return res.status(400).json({ 
          success: false,
          message: "Missing required Contentstack configuration",
          details: {
            apiKey: !apiKey ? "API Key is required" : "✅ Set",
            deliveryToken: !deliveryToken ? "Delivery Token is required" : "✅ Set", 
            environment: !environment ? "Environment is required" : "✅ Set",
            entryUid: !entryUid ? "Entry UID is required" : "✅ Set"
          }
        });
      }

      // First, let's get the content types to find the correct content type UID
      const contentTypesUrl = `https://cdn.contentstack.io/v3/content_types?environment=${environment}`;
      console.log('🌐 Fetching content types from:', contentTypesUrl);
      
      const contentTypesResponse = await fetch(contentTypesUrl, {
        headers: {
          'api_key': apiKey,
          'access_token': deliveryToken,
          'Content-Type': 'application/json'
        }
      });

      if (!contentTypesResponse.ok) {
        const errorText = await contentTypesResponse.text();
        console.log('❌ Content Types API Error:', errorText);
        throw new Error(`Failed to fetch content types: ${contentTypesResponse.status}`);
      }

      const contentTypesData = await contentTypesResponse.json();
      console.log('✅ Content Types loaded:', contentTypesData.content_types?.length || 0, 'types found');
      
      // For demo purposes, let's try to fetch the entry directly with a generic approach
      // or use the first available content type
      const contentTypeUid = contentTypesData.content_types?.[0]?.uid || 'entry';
      const url = `https://cdn.contentstack.io/v3/content_types/${contentTypeUid}/entries/${entryUid}?environment=${environment}`;
      console.log('🌐 Fetching entry from URL:', url);

      const response = await fetch(url, {
        headers: {
          'api_key': apiKey,
          'access_token': deliveryToken,
          'Content-Type': 'application/json'
        }
      });

      console.log('📡 Response Status:', response.status);
      console.log('📡 Response Headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.log('❌ API Error Response:', errorText);
        
        let errorMessage = `Contentstack API error: ${response.status}`;
        let errorDetails = {};
        
        if (response.status === 401) {
          errorMessage = "Authentication failed. Please check your API Key and Delivery Token.";
          errorDetails = {
            issue: "Invalid credentials",
            solution: "Verify your API Key and Delivery Token in Contentstack dashboard"
          };
        } else if (response.status === 403) {
          errorMessage = "Access denied. Please check your Delivery Token permissions.";
          errorDetails = {
            issue: "Insufficient permissions",
            solution: "Ensure your Delivery Token has access to the content type and environment"
          };
        } else if (response.status === 404) {
          errorMessage = "Entry not found. Please check your Entry UID and environment.";
          errorDetails = {
            issue: "Entry or environment not found",
            solution: "Verify the Entry UID exists and is published in the specified environment"
          };
        }
        
        return res.status(response.status).json({
          success: false,
          message: errorMessage,
          details: errorDetails,
          statusCode: response.status,
          response: errorText
        });
      }

      const data = await response.json();
      console.log('✅ Success! Entry data keys:', Object.keys(data.entry || {}));
      
      // Extract content from various possible fields
      let content = '';
      if (data.entry) {
        // Try to find content in common fields
        const possibleContentFields = ['content', 'body', 'description', 'text', 'title', 'name'];
        for (const field of possibleContentFields) {
          if (data.entry[field]) {
            content = typeof data.entry[field] === 'string' 
              ? data.entry[field] 
              : JSON.stringify(data.entry[field], null, 2);
            break;
          }
        }
        
        // If no specific content field found, stringify the entire entry
        if (!content) {
          content = JSON.stringify(data.entry, null, 2);
        }
      }
      
      res.json({ 
        success: true, 
        content: content,
        entry: data.entry,
        message: "Content successfully loaded from Contentstack"
      });
    } catch (error) {
      console.log('❌ Network Error:', error);
      
      let errorMessage = "Failed to load from Contentstack";
      let errorDetails = {};
      
      if (error instanceof Error) {
        if (error.message.includes('fetch')) {
          errorMessage = "Network error. Please check your internet connection.";
          errorDetails = { issue: "Network connectivity", solution: "Check your internet connection" };
        } else if (error.message.includes('CORS')) {
          errorMessage = "CORS error. This is expected when testing from browser.";
          errorDetails = { issue: "CORS policy", solution: "Use the server-side endpoint instead of direct API calls" };
        } else {
          errorMessage = error.message;
        }
      }
      
      res.status(500).json({ 
        success: false,
        message: errorMessage,
        details: errorDetails,
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
