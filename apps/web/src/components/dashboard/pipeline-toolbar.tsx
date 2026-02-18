'use client';

import { useState } from 'react';
import { LoaderCircle } from 'lucide-react';
import { toast } from 'sonner';
import { importTrailmix } from '../../../app/dashboard/actions';

export default function PipelineToolbar() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [url, setUrl] = useState('');

  const isValidTrailheadUrl = (urlString: string): boolean => {
    return urlString.includes('trailhead.salesforce.com') || urlString.includes('trailhead.com');
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Client-side validation
    if (!isValidTrailheadUrl(url)) {
      setError('Enter a valid Trailhead URL');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const formData = new FormData();
      formData.set('url', url);

      const result = await importTrailmix(formData);

      if ('error' in result) {
        toast.error(result.error ?? 'Import failed — check URL');
      } else {
        // Success - form will be reset by server action via revalidatePath
        setUrl('');
      }
    } catch {
      toast.error('Import failed — check URL');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 max-w-md">
      <div className="flex gap-2">
        <input
          type="url"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            setError(null);
          }}
          placeholder="Paste a Trailhead trail or module URL..."
          autoFocus
          required
          disabled={loading}
          className={`flex-1 px-3 py-2 border rounded-md ${
            error ? 'border-destructive' : 'border-input'
          } bg-background focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50`}
        />
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
        >
          {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
          Import
        </button>
      </div>
      {error && <p className="text-destructive text-sm">{error}</p>}
    </form>
  );
}
