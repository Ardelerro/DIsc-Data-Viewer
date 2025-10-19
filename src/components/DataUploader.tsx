import { useState, type FC } from 'react';
import { useData } from '../context/DataContext';


const DataUploader: FC = () => {
  const { uploadData, isLoading } = useData();
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.name.endsWith('.zip')) {
      setError('Please select a valid ZIP file');
      return;
    }

    try {
      setError(null);
      await uploadData(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process file');
    }
  };

  return (
    <div className="p-6 bg-white dark:bg-slate-800 rounded-xl shadow-lg">
      <h2 className="text-2xl font-bold mb-4 text-slate-900 dark:text-white">
        Upload Discord Data Package
      </h2>
      
      {!isLoading && (
        <div>
          <p className="text-slate-600 dark:text-slate-300 mb-4">
            Upload your Discord data package (ZIP file) to process it locally.
            All processing happens in your browser - no data is sent anywhere.
          </p>
          <label className="block">
            <input
              type="file"
              accept=".zip"
              onChange={handleFileSelect}
              className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
            />
          </label>
        </div>
      )}
      
      {isLoading && (
        <div className="text-center">
          <div className="animate-spin h-10 w-10 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400">Processing your data...</p>
        </div>
      )}
      
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
        </div>
      )}
    </div>
  );
};

export default DataUploader;