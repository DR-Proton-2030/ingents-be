import { getOpenAIEmbeddings } from "../../adapter/llm/openai.adapter";
import CompanySettingsModel from "../../models/companySettings/CompanySettings.model";
import { ICompanySettings } from "../../types/interface/companySettings.interface";
import { ICompany } from "../../types/interface/company.interface";
import { RagService } from "../ragService/RagService";
import mongoose from "mongoose";

export interface CompanyEmbeddingData {
  company: ICompany;
  additionalContext?: string[];
}

export class CompanyEmbeddingsService {
  
  private static generateCompanyContent(company: ICompany, additionalContext?: string[]): string {
    const contentParts: string[] = [];
    
    // Company basic information
    if (company.company_name) {
      contentParts.push(`Company Name: ${company.company_name}`);
    }

    if(company.logo) {
        contentParts.push(`Company Logo URL: ${company.logo}`);
    }
    
    if (company.description) {
      contentParts.push(`Company Description: ${company.description}`);
    }
    
    if (company.website) {
      contentParts.push(`Website: ${company.website}`);
    }
    
    if (company.address) {
      contentParts.push(`Address: ${company.address}`);
    }
    
    if (company.phone_number) {
      contentParts.push(`Phone: ${company.phone_number}`);
    }
    
    if (company.industry) {
      contentParts.push(`Industry: ${company.industry}`);
    }
    
    if (company.company_size) {
      contentParts.push(`Company Size: ${company.company_size}`);
    }
    
    if (company.founding_year) {
      contentParts.push(`Founded: ${company.founding_year}`);
    }
    
    // Add services/products if available
    if (company.services && company.services.length > 0) {
      contentParts.push(`Services: ${company.services.join(', ')}`);
    }
    
    if (company.products && company.products.length > 0) {
      contentParts.push(`Products: ${company.products.join(', ')}`);
    }
    
    // Add any additional context provided
    if (additionalContext && additionalContext.length > 0) {
      contentParts.push(...additionalContext);
    }
    
    return contentParts.join('\n');
  }

  private static generateCompanyTags(company: ICompany): string[] {
    const tags: string[] = [];
    
    if (company.industry) {
      tags.push(company.industry.toLowerCase());
    }
    
    if (company.company_size) {
      tags.push(company.company_size.toLowerCase().replace(/\s+/g, '_'));
    }
    
    // Extract keywords from company name and description
    const textToAnalyze = `${company.company_name || ''} ${company.description || ''}`;
    const keywords = textToAnalyze
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 3)
      .filter(word => !['company', 'business', 'service', 'solution', 'and', 'the', 'for', 'with'].includes(word))
      .slice(0, 5); // Limit to top 5 keywords
    
    tags.push(...keywords);
    
    return [...new Set(tags)]; // Remove duplicates
  }

  static async createCompanyEmbeddings(
    companyData: CompanyEmbeddingData,
    session?: mongoose.ClientSession
  ): Promise<ICompanySettings> {
    try {
      const { company, additionalContext } = companyData;
      
      if (!company._id) {
        throw new Error('Company must have an _id to create embeddings');
      }

      // Generate comprehensive content for embedding
      const companyContent = this.generateCompanyContent(company, additionalContext);
      
      if (!companyContent.trim()) {
        throw new Error('No content available to generate embeddings');
      }

      console.log(`Generating embeddings for company: ${company.company_name}`);
      console.log(`Content length: ${companyContent.length} characters`);

      // Create RAG service for this company
      const ragService = new RagService(String(company._id));
      
      // Process the content and get embeddings
    //   const vectorChunks = await ragService.processText(companyContent, {
    //     type: 'company_profile',
    //     companyId: String(company._id),
    //     companyName: company.company_name,
    //     industry: company.industry,
    //     createdAt: new Date()
    //   });

      // For company settings, we'll store the embedding of the main content
      const mainEmbedding = await getOpenAIEmbeddings(companyContent);
      
      // Generate tags
      const tags = this.generateCompanyTags(company);
      
      const language = 'en';

      // Create comprehensive metadata
      const metadata = {
        source: 'company_profile',
        type: 'company_embeddings',
        industry: company.industry || 'unknown',
        companySize: company.company_size || 'unknown',
        lastUpdated: new Date(),
        documentCount: 1,
        averageRelevance: 1.0,
        contentLength: companyContent.length,
        embeddingDimensions: mainEmbedding.length,
        foundingYear: company.founding_year,
        hasLogo: !!company.logo,
        hasWebsite: !!company.website,
        servicesCount: company.services?.length || 0,
        productsCount: company.products?.length || 0,
        additionalContextProvided: !!additionalContext && additionalContext.length > 0
      };

      // Create company settings payload
      const companySettingsPayload: Partial<ICompanySettings> = {
        company_object_id: company._id,
        content: companyContent,
        embedding: mainEmbedding,
        tags,
        language,
        metadata
      };

      // Save to database
      const companySettings = await new CompanySettingsModel(companySettingsPayload).save(
        session ? { session } : {}
      );

      // Cleanup RAG service
      ragService.cleanup();

      console.log(`Company embeddings created successfully for: ${company.company_name}`);
      console.log(`Generated ${tags.length} tags and ${mainEmbedding.length}-dimensional embedding`);
      
      return companySettings;
    } catch (error) {
      console.error('Error creating company embeddings:', error);
      throw new Error(`Failed to create company embeddings: ${error}`);
    }
  }

  static async updateCompanyEmbeddings(
    companyObjectId: string,
    companyData: CompanyEmbeddingData,
    session?: mongoose.ClientSession
  ): Promise<ICompanySettings | null> {
    try {
      const { company, additionalContext } = companyData;
      
      // Generate new content and embeddings
      const companyContent = this.generateCompanyContent(company, additionalContext);
      
      if (!companyContent.trim()) {
        throw new Error('No content available to update embeddings');
      }

      const mainEmbedding = await getOpenAIEmbeddings(companyContent);
      const tags = this.generateCompanyTags(company);
      const language = 'en';

      // Update existing company settings
      const updatedSettings = await CompanySettingsModel.findOneAndUpdate(
        { company_object_id: companyObjectId },
        {
          content: companyContent,
          embedding: mainEmbedding,
          tags,
          language
        },
        { 
          new: true,
          session: session || undefined
        }
      );

      console.log(`Company embeddings updated successfully for company: ${companyObjectId}`);
      
      return updatedSettings;
    } catch (error) {
      console.error('Error updating company embeddings:', error);
      throw new Error(`Failed to update company embeddings: ${error}`);
    }
  }

  static async getCompanyEmbeddings(companyObjectId: string): Promise<ICompanySettings | null> {
    try {
      const companySettings = await CompanySettingsModel.findOne({ 
        company_object_id: companyObjectId 
      });
      
      return companySettings;
    } catch (error) {
      console.error('Error fetching company embeddings:', error);
      throw new Error(`Failed to fetch company embeddings: ${error}`);
    }
  }

  static async deleteCompanyEmbeddings(
    companyObjectId: string,
    session?: mongoose.ClientSession
  ): Promise<boolean> {
    try {
      const result = await CompanySettingsModel.deleteOne(
        { company_object_id: companyObjectId },
        session ? { session } : {}
      );
      
      return result.deletedCount > 0;
    } catch (error) {
      console.error('Error deleting company embeddings:', error);
      throw new Error(`Failed to delete company embeddings: ${error}`);
    }
  }

  static async findSimilarCompanies(
    queryEmbedding: number[],
    limit: number = 5,
    excludeCompanyId?: string
  ): Promise<ICompanySettings[]> {
    try {
      // This is a basic implementation. For production, you'd want to use a proper vector database
      const allCompanySettings = await CompanySettingsModel.find(
        excludeCompanyId ? { company_object_id: { $ne: excludeCompanyId } } : {}
      ).limit(limit * 2); // Get more than needed for filtering
      
      // Calculate similarities (basic implementation)
      const similarities = allCompanySettings.map(settings => {
        if (!settings.embedding || settings.embedding.length === 0) {
          return { settings, similarity: 0 };
        }
        
        // Simple cosine similarity
        const dotProduct = queryEmbedding.reduce((sum, val, i) => 
          sum + val * (settings.embedding[i] || 0), 0
        );
        const magnitudeA = Math.sqrt(queryEmbedding.reduce((sum, val) => sum + val * val, 0));
        const magnitudeB = Math.sqrt(settings.embedding.reduce((sum: number, val: number) => sum + val * val, 0));
        
        const similarity = dotProduct / (magnitudeA * magnitudeB);
        return { settings, similarity };
      });
      
      // Sort by similarity and return top results
      return similarities
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit)
        .map(item => item.settings);
    } catch (error) {
      console.error('Error finding similar companies:', error);
      throw new Error(`Failed to find similar companies: ${error}`);
    }
  }
}