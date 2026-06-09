import { NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/require-api-auth';
import { generateDocument, getDocumentTypesForCategory, extractBudgetItems } from '@/lib/document-generator';
import { resolveTaskWithAi, generateWithFallback } from '@/lib/gemini';
import { detectTaskCategory } from '@/lib/task-agents';
export const runtime = 'nodejs';


export async function POST(req: Request) {
  const authError = await requireApiAuth(req as any);
  if (authError) return authError;
  try {
    const { task, eventData, docType } = await req.json();

    if (!task || !eventData) {
      return NextResponse.json({ error: 'Missing task or eventData' }, { status: 400 });
    }

    const category = task.category || detectTaskCategory(task, eventData);

    // If no docType specified, use the first available for this category
    const availableTypes = getDocumentTypesForCategory(category);
    const requestedType = docType || availableTypes[0] || 'rundown';

    if (!availableTypes.includes(requestedType)) {
      return NextResponse.json(
        { error: `Document type "${requestedType}" not available for category "${category}". Available: ${availableTypes.join(', ')}` },
        { status: 400 },
      );
    }

    // Resolve the task first to get steps + sourcing intel
    const resolution = await resolveTaskWithAi(task, eventData);

    // Generate the document using the resolution context
    const document = await generateDocument(
      requestedType,
      { id: task.id, title: task.title, description: task.description },
      eventData,
      resolution.steps,
      resolution.sourcingSummary,
      generateWithFallback,
    );

    return NextResponse.json({
      document,
      category,
      documentType: requestedType,
      availableTypes,
      budgetItems: document.type === 'budget' ? extractBudgetItems(document, task.id) : null,
    });
  } catch (error: any) {
    console.error('[API] generate-document error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate document' },
      { status: 500 },
    );
  }
}
