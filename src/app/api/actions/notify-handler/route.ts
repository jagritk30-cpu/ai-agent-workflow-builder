import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Event Trigger payload structure from Hasura
    if (body.event && body.table) {
      const { event, table } = body;
      console.log(`Received event for table ${table.name}:`, event.op);
      // Can implement additional logic here for workflow_updated events
      return NextResponse.json({ success: true, message: 'Event logged' });
    }

    // Direct notify step call (if applicable through this endpoint)
    if (body.message) {
      const message = body.message;
      const slackWebhook = process.env.SLACK_WEBHOOK_URL;
      if (slackWebhook) {
        await fetch(slackWebhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: message })
        });
        return NextResponse.json({ success: true, message: 'Notification sent' });
      } else {
        console.log('Notification message:', message);
        return NextResponse.json({ success: true, message: 'Notification logged (No webhook configured)' });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Notify handler error:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
