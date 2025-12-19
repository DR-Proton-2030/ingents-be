"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatScrapedDataAsDetails = exports.scrapeCompanyWebsite = void 0;
const axios_1 = __importDefault(require("axios"));
const scrapeCompanyWebsite = (websiteUrl_1, ...args_1) => __awaiter(void 0, [websiteUrl_1, ...args_1], void 0, function* (websiteUrl, timeout = 10000) {
    try {
        // Ensure URL has protocol
        const url = websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`;
        const response = yield axios_1.default.get(url, {
            timeout,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        const htmlContent = response.data;
        // Extract meta description
        let description = '';
        const metaDescMatch = htmlContent.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["'][^>]*>/i);
        if (metaDescMatch) {
            description = metaDescMatch[1];
        }
        // If no meta description, extract from body content
        if (!description) {
            // Remove script and style tags
            const cleanHtml = htmlContent
                .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                .replace(/<[^>]*>/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();
            description = cleanHtml.slice(0, 500);
        }
        // Extract industry keywords
        let industry = '';
        const industryKeywords = htmlContent.toLowerCase();
        const industries = [
            'technology', 'healthcare', 'finance', 'education', 'retail',
            'manufacturing', 'consulting', 'software', 'marketing', 'real estate',
            'construction', 'automotive', 'telecommunications', 'energy', 'logistics'
        ];
        for (const ind of industries) {
            if (industryKeywords.includes(ind)) {
                industry = ind;
                break;
            }
        }
        // Extract services (simple text extraction)
        const services = [];
        const servicePatterns = [
            /services?[:\-\s]*([^<>\n]{10,100})/gi,
            /we offer[:\-\s]*([^<>\n]{10,100})/gi,
            /solutions?[:\-\s]*([^<>\n]{10,100})/gi
        ];
        for (const pattern of servicePatterns) {
            const matches = htmlContent.match(pattern);
            if (matches) {
                matches.slice(0, 5).forEach(match => {
                    const cleanService = match.replace(/<[^>]*>/g, '').trim();
                    if (cleanService.length > 10 && cleanService.length < 100) {
                        services.push(cleanService);
                    }
                });
            }
            if (services.length > 0)
                break;
        }
        // Extract contact info
        let contactInfo = '';
        const emailMatch = htmlContent.match(/[\w\.-]+@[\w\.-]+\.\w+/);
        const phoneMatch = htmlContent.match(/[\+]?[1-9]?[\d\s\-\(\)]{10,}/);
        contactInfo = [
            emailMatch ? `Email: ${emailMatch[0]}` : '',
            phoneMatch ? `Phone: ${phoneMatch[0]}` : ''
        ].filter(Boolean).join(', ');
        return {
            description: description || '',
            industry: industry || '',
            services: services.slice(0, 5),
            contactInfo: contactInfo || ''
        };
    }
    catch (error) {
        console.error(`Error scraping website ${websiteUrl}:`, error);
        return {
            description: '',
            industry: '',
            services: [],
            contactInfo: ''
        };
    }
});
exports.scrapeCompanyWebsite = scrapeCompanyWebsite;
const formatScrapedDataAsDetails = (data) => {
    const parts = [];
    if (data.description) {
        parts.push(`Description: ${data.description}`);
    }
    if (data.industry) {
        parts.push(`Industry: ${data.industry}`);
    }
    if (data.services.length > 0) {
        parts.push(`Services: ${data.services.join(', ')}`);
    }
    if (data.contactInfo) {
        parts.push(`Contact: ${data.contactInfo}`);
    }
    return parts.join('\n\n');
};
exports.formatScrapedDataAsDetails = formatScrapedDataAsDetails;
