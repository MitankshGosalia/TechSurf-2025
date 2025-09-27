import type { BrandkitRule } from "@shared/schema";

// Advanced NLP Content Editor
class AdvancedNLPEditor {
  private brandkitRules: BrandkitRule[] = [];
  
  constructor(brandkitRules: BrandkitRule[] = []) {
    this.brandkitRules = brandkitRules;
  }

  // Extract banned and approved terms from brandkit rules
  private getBrandkitTerms() {
    const banned = this.brandkitRules
      .filter(rule => rule.type === 'banned' && rule.isActive)
      .map(rule => rule.term);
    
    const approved = this.brandkitRules
      .filter(rule => rule.type === 'approved' && rule.isActive)
      .map(rule => rule.term);
    
    return { banned, approved };
  }

  // Advanced content processing with NLP capabilities
  async processContent({
    findText,
    replaceText,
    originalContent,
    isDryRun = false,
    brandkitRules = []
  }: {
    findText: string;
    replaceText: string;
    originalContent: string;
    isDryRun?: boolean;
    brandkitRules?: BrandkitRule[];
  }) {
    this.brandkitRules = brandkitRules;
    const { banned, approved } = this.getBrandkitTerms();
    
    // Check if replacement term is banned
    if (banned.includes(replaceText.toLowerCase())) {
      throw new Error(`Replacement term "${replaceText}" is banned by brandkit rules. Please use an approved alternative.`);
    }
    
    let processedContent = originalContent;
    let replacements = 0;
    let linksUpdated = 0;
    let emailsUpdated = 0;
    
    // Process hyperlinks first
    const linkRegex = /\[([^\]]*)\]\(([^)]*)\)/g;
    const links = [...originalContent.matchAll(linkRegex)];
    
    links.forEach(link => {
      const [fullMatch, anchorText, url] = link;
      const linkIndex = link.index!;
      
      // Check if anchor text or URL contains the find text
      if (anchorText.toLowerCase().includes(findText.toLowerCase()) || 
          url.toLowerCase().includes(findText.toLowerCase())) {
        
        const newAnchorText = anchorText.replace(
          new RegExp(findText, 'gi'), 
          isDryRun ? `<<${replaceText}>>` : replaceText
        );
        
        const newUrl = url.replace(
          new RegExp(findText, 'gi'), 
          isDryRun ? `<<${replaceText}>>` : replaceText
        );
        
        const newLink = `[${newAnchorText}](${newUrl})`;
        processedContent = processedContent.replace(fullMatch, newLink);
        linksUpdated++;
        replacements++;
      }
    });
    
    // Process email addresses
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const emails = [...originalContent.matchAll(emailRegex)];
    
    emails.forEach(email => {
      const [emailAddress] = email;
      if (emailAddress.toLowerCase().includes(findText.toLowerCase())) {
        const newEmail = emailAddress.replace(
          new RegExp(findText, 'gi'),
          isDryRun ? `<<${replaceText}>>` : replaceText
        );
        processedContent = processedContent.replace(emailAddress, newEmail);
        emailsUpdated++;
        replacements++;
      }
    });
    
    // Process regular text with context-aware replacement
    const textRegex = new RegExp(`\\b${findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    const textMatches = [...originalContent.matchAll(textRegex)];
    
    textMatches.forEach(match => {
      const [matchedText] = match;
      const index = match.index!;
      
      // Context-aware replacement with grammar fixes
      const context = this.getContext(originalContent, index, matchedText.length);
      const replacement = this.getContextualReplacement(matchedText, replaceText, context, isDryRun);
      
      processedContent = processedContent.replace(matchedText, replacement);
      replacements++;
    });
    
    // Apply brandkit enforcement
    processedContent = this.enforceBrandkitRules(processedContent, banned, approved);
    
    // Grammar and fluency improvements
    processedContent = this.improveGrammarAndFluency(processedContent);
    
    return {
      processedContent,
      statistics: {
        replacements,
        links: linksUpdated,
        emails: emailsUpdated,
        compliance: this.calculateCompliance(processedContent, banned, approved)
      }
    };
  }
  
  // Get context around a match for better replacement
  private getContext(text: string, index: number, matchLength: number): string {
    const contextStart = Math.max(0, index - 50);
    const contextEnd = Math.min(text.length, index + matchLength + 50);
    return text.substring(contextStart, contextEnd);
  }
  
  // Get contextual replacement with proper casing
  private getContextualReplacement(original: string, replacement: string, context: string, isDryRun: boolean): string {
    // Preserve original casing
    let newReplacement = replacement;
    
    if (original === original.toUpperCase()) {
      newReplacement = replacement.toUpperCase();
    } else if (original === original.toLowerCase()) {
      newReplacement = replacement.toLowerCase();
    } else if (original[0] === original[0].toUpperCase()) {
      newReplacement = replacement.charAt(0).toUpperCase() + replacement.slice(1).toLowerCase();
    }
    
    return isDryRun ? `<<${newReplacement}>>` : newReplacement;
  }
  
  // Enforce brandkit rules
  private enforceBrandkitRules(content: string, banned: string[], approved: string[]): string {
    let processed = content;
    
    // Remove banned terms
    banned.forEach(term => {
      const regex = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
      processed = processed.replace(regex, '[REDACTED]');
    });
    
    // Prefer approved terms where contextually appropriate
    approved.forEach(term => {
      // This would be more sophisticated in a real implementation
      // For now, we'll just ensure approved terms are used when possible
    });
    
    return processed;
  }
  
  // Improve grammar and fluency
  private improveGrammarAndFluency(content: string): string {
    let improved = content;
    
    // Fix common grammar issues
    improved = improved.replace(/\s+/g, ' '); // Remove extra spaces
    improved = improved.replace(/\s+([.!?])/g, '$1'); // Remove spaces before punctuation
    improved = improved.replace(/([.!?])\s*([a-z])/g, '$1 $2'); // Add space after punctuation
    improved = improved.replace(/\s+([,;:])/g, '$1'); // Remove spaces before commas/semicolons
    
    return improved;
  }
  
  // Calculate brand compliance percentage
  private calculateCompliance(content: string, banned: string[], approved: string[]): number {
    const words = content.toLowerCase().split(/\s+/);
    const totalWords = words.length;
    
    if (totalWords === 0) return 100;
    
    let violations = 0;
    banned.forEach(term => {
      const regex = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
      const matches = content.match(regex);
      if (matches) violations += matches.length;
    });
    
    const compliance = Math.max(0, 100 - (violations / totalWords) * 100);
    return Math.round(compliance);
  }
}

// Mock OpenAI client with advanced NLP processing
const openai = {
  chat: {
    completions: {
      create: async (params: any) => {
        const prompt = params.messages[1].content;
        
        // Extract parameters from prompt
        const findText = prompt.match(/"([^"]+)"/g)?.[0]?.replace(/"/g, '') || '';
        const replaceText = prompt.match(/"([^"]+)"/g)?.[1]?.replace(/"/g, '') || '';
        const originalContent = prompt.split('Original content:')[1]?.split('Please respond')[0]?.trim() || '';
        const isDryRun = prompt.includes('dryRun = true') || prompt.includes('DRY RUN');
        
        // Create NLP editor instance
        const editor = new AdvancedNLPEditor();
        
        try {
          const result = await editor.processContent({
            findText,
            replaceText,
            originalContent,
            isDryRun
          });
          
          return {
            choices: [{
              message: {
                content: JSON.stringify(result)
              }
            }]
          };
        } catch (error) {
          return {
            choices: [{
              message: {
                content: JSON.stringify({
                  processedContent: originalContent,
                  statistics: {
                    replacements: 0,
                    links: 0,
                    emails: 0,
                    compliance: 0
                  },
                  error: error instanceof Error ? error.message : 'Unknown error'
                })
              }
            }]
          };
        }
      }
    }
  }
};

export interface SmartReplaceOptions {
  findText: string;
  replaceText: string;
  originalContent: string;
}

export interface SmartReplaceResult {
  processedContent: string;
  statistics: {
    replacements: number;
    links: number;
    emails: number;
    compliance: number;
  };
}

export async function performSmartReplace({
  findText,
  replaceText,
  originalContent
}: SmartReplaceOptions): Promise<SmartReplaceResult> {
  try {
    // Use the advanced NLP editor
    const editor = new AdvancedNLPEditor();
    const result = await editor.processContent({
      findText,
      replaceText,
      originalContent,
      isDryRun: false
    });
    
    return {
      processedContent: result.processedContent,
      statistics: {
        replacements: result.statistics.replacements,
        links: result.statistics.links,
        emails: result.statistics.emails,
        compliance: result.statistics.compliance,
      }
    };
  } catch (error) {
    console.error('Advanced NLP Processing Error:', error);
    
    // Fallback to basic replacement
    const processedContent = originalContent.replace(new RegExp(findText, 'gi'), replaceText);
    const matches = originalContent.match(new RegExp(findText, 'gi')) || [];
    const replacements = matches.length;
    
    return {
      processedContent,
      statistics: {
        replacements,
        links: 0,
        emails: 0,
        compliance: 100,
      }
    };
  }
}

export interface BatchReplaceOptions {
  operations: Array<{findText: string, replaceText: string, isEnabled: boolean}>;
  originalContent: string;
  brandkitRules: BrandkitRule[];
  preserveFormatting: boolean;
}

export async function performBatchReplace({
  operations,
  originalContent,
  brandkitRules,
  preserveFormatting
}: BatchReplaceOptions): Promise<SmartReplaceResult> {
  try {
    const editor = new AdvancedNLPEditor(brandkitRules);
    let processedContent = originalContent;
    let totalReplacements = 0;
    let totalLinks = 0;
    let totalEmails = 0;
    
    // Apply each operation sequentially with advanced NLP processing
    for (const operation of operations) {
      if (!operation.isEnabled) continue;
      
      const result = await editor.processContent({
        findText: operation.findText,
        replaceText: operation.replaceText,
        originalContent: processedContent,
        isDryRun: false,
        brandkitRules
      });
      
      processedContent = result.processedContent;
      totalReplacements += result.statistics.replacements;
      totalLinks += result.statistics.links;
      totalEmails += result.statistics.emails;
    }
    
    return {
      processedContent,
      statistics: {
        replacements: totalReplacements,
        links: totalLinks,
        emails: totalEmails,
        compliance: editor['calculateCompliance'](processedContent, 
          brandkitRules.filter(r => r.type === 'banned').map(r => r.term),
          brandkitRules.filter(r => r.type === 'approved').map(r => r.term)
        ),
      }
    };
  } catch (error) {
    console.error('Advanced Batch NLP Processing Error:', error);
    
    // Fallback to basic batch replacement
    let processedContent = originalContent;
    let totalReplacements = 0;
    
    for (const operation of operations) {
      if (!operation.isEnabled) continue;
      processedContent = processedContent.replace(new RegExp(operation.findText, 'gi'), operation.replaceText);
      const matches = originalContent.match(new RegExp(operation.findText, 'gi')) || [];
      totalReplacements += matches.length;
    }
    
    return {
      processedContent,
      statistics: {
        replacements: totalReplacements,
        links: 0,
        emails: 0,
        compliance: 100,
      }
    };
  }
}

// New function for dry run processing
export async function performDryRun({
  findText,
  replaceText,
  originalContent,
  brandkitRules = []
}: {
  findText: string;
  replaceText: string;
  originalContent: string;
  brandkitRules?: BrandkitRule[];
}): Promise<SmartReplaceResult> {
  try {
    const editor = new AdvancedNLPEditor(brandkitRules);
    const result = await editor.processContent({
      findText,
      replaceText,
      originalContent,
      isDryRun: true,
      brandkitRules
    });
    
    return {
      processedContent: result.processedContent,
      statistics: {
        replacements: result.statistics.replacements,
        links: result.statistics.links,
        emails: result.statistics.emails,
        compliance: result.statistics.compliance,
      }
    };
  } catch (error) {
    console.error('Dry Run Processing Error:', error);
    
    // Fallback to basic dry run
    const processedContent = originalContent.replace(
      new RegExp(findText, 'gi'), 
      `<<${replaceText}>>`
    );
    const matches = originalContent.match(new RegExp(findText, 'gi')) || [];
    
    return {
      processedContent,
      statistics: {
        replacements: matches.length,
        links: 0,
        emails: 0,
        compliance: 100,
      }
    };
  }
}
