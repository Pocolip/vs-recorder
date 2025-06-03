// src/pages/ImportPage.jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Upload, FileText, Database, AlertCircle } from 'lucide-react';
import { Footer } from '../components';

const ImportPage = () => {
    const [selectedFile, setSelectedFile] = useState(null);
    const [importType, setImportType] = useState('json');

    const handleFileSelect = (event) => {
        const file = event.target.files[0];
        setSelectedFile(file);
    };

    const handleImport = () => {
        // TODO: Implement actual import functionality
        if (!selectedFile) {
            alert('Please select a file to import');
            return;
        }
        alert(`Import functionality will be implemented soon!\nFile: ${selectedFile.name}\nType: ${importType}`);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 to-slate-900 flex flex-col">
            <div className="flex-1 p-6">
                <div className="max-w-4xl mx-auto">
                    {/* Header */}
                    <div className="flex items-center mb-8">
                        <Link
                            to="/"
                            className="mr-4 p-2 text-gray-400 hover:text-gray-200 rounded-lg hover:bg-slate-800 transition-colors"
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                        <div>
                            <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent">
                                Import Data
                            </h1>
                            <p className="text-gray-400">Import your teams and replays from backup files</p>
                        </div>
                    </div>

                    {/* Import Options */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                        {/* Import Type Selection */}
                        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-6">
                            <h2 className="text-xl font-semibold text-gray-100 mb-4 flex items-center gap-2">
                                <Database className="h-5 w-5" />
                                Import Type
                            </h2>

                            <div className="space-y-3">
                                <label className="flex items-center gap-3 p-3 border border-slate-600 rounded-lg cursor-pointer hover:bg-slate-700/30 transition-colors">
                                    <input
                                        type="radio"
                                        name="importType"
                                        value="json"
                                        checked={importType === 'json'}
                                        onChange={(e) => setImportType(e.target.value)}
                                        className="text-emerald-500"
                                    />
                                    <div>
                                        <p className="text-gray-200 font-medium">VS Recorder Backup</p>
                                        <p className="text-gray-400 text-sm">JSON file exported from VS Recorder</p>
                                    </div>
                                </label>

                                <label className="flex items-center gap-3 p-3 border border-slate-600 rounded-lg cursor-pointer hover:bg-slate-700/30 transition-colors opacity-50">
                                    <input
                                        type="radio"
                                        name="importType"
                                        value="spreadsheet"
                                        disabled
                                        className="text-emerald-500"
                                    />
                                    <div>
                                        <p className="text-gray-200 font-medium">Spreadsheet Import</p>
                                        <p className="text-gray-400 text-sm">Import from Google Sheets (Coming Soon)</p>
                                    </div>
                                </label>

                                <label className="flex items-center gap-3 p-3 border border-slate-600 rounded-lg cursor-pointer hover:bg-slate-700/30 transition-colors opacity-50">
                                    <input
                                        type="radio"
                                        name="importType"
                                        value="other"
                                        disabled
                                        className="text-emerald-500"
                                    />
                                    <div>
                                        <p className="text-gray-200 font-medium">Other Formats</p>
                                        <p className="text-gray-400 text-sm">CSV, other analytics tools (Coming Soon)</p>
                                    </div>
                                </label>
                            </div>
                        </div>

                        {/* File Upload */}
                        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-6">
                            <h2 className="text-xl font-semibold text-gray-100 mb-4 flex items-center gap-2">
                                <Upload className="h-5 w-5" />
                                Select File
                            </h2>

                            <div className="border-2 border-dashed border-slate-600 rounded-lg p-8 text-center hover:border-slate-500 transition-colors">
                                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />

                                {selectedFile ? (
                                    <div>
                                        <p className="text-gray-200 font-medium mb-2">Selected File:</p>
                                        <p className="text-emerald-400 mb-4">{selectedFile.name}</p>
                                        <p className="text-gray-400 text-sm mb-4">
                                            Size: {(selectedFile.size / 1024).toFixed(1)} KB
                                        </p>
                                    </div>
                                ) : (
                                    <div>
                                        <p className="text-gray-200 mb-2">Choose a file to import</p>
                                        <p className="text-gray-400 text-sm mb-4">
                                            Supported formats: JSON
                                        </p>
                                    </div>
                                )}

                                <input
                                    type="file"
                                    accept=".json"
                                    onChange={handleFileSelect}
                                    className="hidden"
                                    id="file-upload"
                                />
                                <label
                                    htmlFor="file-upload"
                                    className="inline-block bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg cursor-pointer transition-colors"
                                >
                                    {selectedFile ? 'Choose Different File' : 'Choose File'}
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Warning Box */}
                    <div className="bg-yellow-600/20 border border-yellow-600/30 rounded-lg p-4 mb-8">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="h-5 w-5 text-yellow-400 mt-0.5 flex-shrink-0" />
                            <div>
                                <h3 className="text-yellow-400 font-medium mb-1">Important Notice</h3>
                                <p className="text-gray-300 text-sm">
                                    Importing data will merge with your existing teams and replays.
                                    Consider exporting your current data as a backup before importing new data.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Import Button */}
                    <div className="flex justify-center">
                        <button
                            onClick={handleImport}
                            disabled={!selectedFile}
                            className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white px-8 py-3 rounded-lg flex items-center gap-2 transition-colors"
                        >
                            <Upload className="h-5 w-5" />
                            Import Data
                        </button>
                    </div>
                </div>
            </div>
            <Footer />
        </div>
    );
};

export default ImportPage;