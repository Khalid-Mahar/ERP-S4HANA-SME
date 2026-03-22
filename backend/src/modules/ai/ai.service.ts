import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private openai: OpenAI | null = null;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
    } else {
      this.logger.warn('AI Integration: OPENAI_API_KEY not found. AI features will be disabled.');
    }
  }

  async generateItemDescription(itemName: string, category?: string) {
    if (!this.openai) return 'AI description generation is currently disabled.';

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are an expert inventory manager. Generate a concise, professional product description for an ERP system.'
          },
          {
            role: 'user',
            content: `Generate a 2-sentence description for a product named "${itemName}"${category ? ` in the category "${category}"` : ''}.`
          }
        ],
        max_tokens: 100,
      });

      return response.choices[0]?.message?.content?.trim() || 'No description generated.';
    } catch (error) {
      this.logger.error(`AI Description Error: ${error.message}`);
      return 'Error generating AI description.';
    }
  }

  async analyzeBusinessTrends(prompt: string, context: any) {
    if (!this.openai) return { message: 'AI analytics is currently disabled.' };

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: 'You are a senior business analyst. Analyze the provided ERP data context and answer the user query with actionable insights.'
          },
          {
            role: 'user',
            content: `Query: ${prompt}\n\nData Context: ${JSON.stringify(context)}`
          }
        ],
        response_format: { type: 'json_object' }
      });

      return JSON.parse(response.choices[0]?.message?.content || '{}');
    } catch (error) {
      this.logger.error(`AI Analytics Error: ${error.message}`);
      return { error: 'Failed to perform AI analysis.' };
    }
  }
}
