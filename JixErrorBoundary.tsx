import React from 'react';

interface State {
  error: Error | null;
}

// ماسك أخطاء مؤقت - يعرض تفاصيل أي خطأ يوقف التطبيق بدل شاشة فاضية سوداء
// بعد ما نحل كل الأخطاء، تقدر تشيل هذا الملف وترجع main.tsx لشكله البسيط
export class JixErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[JIX] Fatal render error:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            minHeight: '100vh',
            background: '#0E0E12',
            color: '#fff',
            padding: '20px',
            fontFamily: 'monospace',
            direction: 'ltr',
            textAlign: 'left',
          }}
        >
          <h2 style={{ color: '#FF3B5C', marginBottom: '12px' }}>حدث خطأ - JIX Debug</h2>
          <p style={{ fontSize: '13px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {this.state.error.message}
          </p>
          <p style={{ fontSize: '11px', color: '#888', marginTop: '16px', whiteSpace: 'pre-wrap' }}>
            {this.state.error.stack}
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}
