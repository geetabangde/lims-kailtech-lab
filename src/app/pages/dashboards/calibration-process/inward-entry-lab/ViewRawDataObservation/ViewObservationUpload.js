export const uploadTableConfig = {
  id: 'observationupload',
  name: 'Observation Upload',
  category: 'Upload',
  structure: {
    singleHeaders: ['ULR No', 'Issue Date', 'Uploaded Document'],
    subHeaders: {},
    remainingHeaders: [],
  },
};

export const createUploadViewRows = (dataArray) => {
  const items = Array.isArray(dataArray) ? dataArray : [dataArray];
  return items.filter(Boolean).map((item) => [
    item.ulrno || item.ulr_no || '-',
    item.issuedate || item.issue_date || '-',
    item.filename || item.certificate || 'Uploaded Certificate File',
  ]);
};
