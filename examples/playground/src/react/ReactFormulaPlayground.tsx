import { useMemo, useState } from 'react';
import { MathjaxBeautiful, sanitizeHtml } from 'react-mathjax-beautiful';

interface ReactFormulaPlaygroundProps {
  isDark?: boolean;
}

const samples = [
  { name: 'Mass energy', latex: 'E = mc^2' },
  { name: 'Quadratic formula', latex: 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}' },
  { name: 'Euler identity', latex: 'e^{i\\pi} + 1 = 0' },
  { name: 'Matrix', latex: '\\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix}' },
];

export default function ReactFormulaPlayground({ isDark = false }: ReactFormulaPlaygroundProps) {
  const [open, setOpen] = useState(false);
  const [inlineLatex, setInlineLatex] = useState('\\frac{a}{b} + \\sqrt{x}');
  const [dialogLatex, setDialogLatex] = useState('E = mc^2');
  const [insertedFormula, setInsertedFormula] = useState('$$E = mc^2$$');
  const theme = isDark ? 'dark' : 'light';

  const safeFormula = useMemo(() => sanitizeHtml(insertedFormula), [insertedFormula]);

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <section className="rounded-2xl border border-gray-200 bg-white/90 p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800/90">
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-300">
              React MVP
            </p>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Inline formula editor
            </h2>
          </div>
          <span className="text-sm text-gray-500 dark:text-gray-400">react-mathjax-beautiful</span>
        </div>

        <MathjaxBeautiful
          inline
          theme={theme}
          locale="en-US"
          value={inlineLatex}
          onChange={setInlineLatex}
          onInsert={setInsertedFormula}
        />
      </section>

      <aside className="space-y-4 rounded-2xl border border-gray-200 bg-white/90 p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800/90">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-300">
            Dialog mode
          </p>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Controlled from React state
          </h2>
        </div>

        <textarea
          value={dialogLatex}
          onChange={(event) => setDialogLatex(event.target.value)}
          className="min-h-[112px] w-full resize-y rounded-lg border border-gray-300 bg-white p-3 font-mono text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
        />

        <button
          type="button"
          className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => setOpen(true)}
        >
          Edit in React dialog
        </button>

        <div className="grid gap-2">
          {samples.map((sample) => (
            <button
              type="button"
              key={sample.name}
              className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-left transition hover:border-blue-300 hover:bg-blue-50 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-blue-500 dark:hover:bg-blue-950/40"
              onClick={() => {
                setDialogLatex(sample.latex);
                setInlineLatex(sample.latex);
              }}
            >
              <strong className="block text-sm text-gray-900 dark:text-white">{sample.name}</strong>
              <code className="mt-1 block break-words text-xs text-blue-700 dark:text-blue-300">
                {sample.latex}
              </code>
            </button>
          ))}
        </div>
      </aside>

      <section className="xl:col-span-2 rounded-2xl border border-gray-200 bg-white/90 p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800/90">
        <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Last inserted formula</h2>
          <code className="break-words rounded bg-gray-100 px-2 py-1 text-sm text-blue-700 dark:bg-gray-900 dark:text-blue-300">
            {insertedFormula}
          </code>
        </div>
        <pre className="max-h-40 overflow-auto rounded-lg bg-gray-950 p-4 text-xs text-blue-100">
          {safeFormula}
        </pre>
      </section>

      <MathjaxBeautiful
        open={open}
        onOpenChange={setOpen}
        existingLatex={dialogLatex}
        theme={theme}
        locale="en-US"
        onChange={setDialogLatex}
        onInsert={setInsertedFormula}
      />
    </div>
  );
}
