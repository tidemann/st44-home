import { escapeHtml } from './qr-code-display';

describe('escapeHtml', () => {
  it('escapes a child name before it goes into the print window', () => {
    expect(escapeHtml(`Ola "<img src=x onerror=alert(1)>" & 'Kari'`)).toBe(
      'Ola &quot;&lt;img src=x onerror=alert(1)&gt;&quot; &amp; &#39;Kari&#39;',
    );
  });

  it('keeps æøå as they are', () => {
    expect(escapeHtml('Bjørn Ærlig Åse')).toBe('Bjørn Ærlig Åse');
  });
});
