/**
 * Utility functions for Viewer Admin restrictions
 * Viewer Admin should have pure visibility - no interactive elements
 */

export const getViewerAdminProps = (isViewerAdmin: boolean) => {
  return {
    disabled: isViewerAdmin,
    className: isViewerAdmin 
      ? 'disabled:bg-gray-200 disabled:text-gray-500 disabled:cursor-not-allowed opacity-60'
      : '',
    title: isViewerAdmin ? 'Viewer Admin - View Only' : undefined,
  };
};

export const getViewerAdminInputProps = (isViewerAdmin: boolean) => {
  return {
    readOnly: isViewerAdmin,
    disabled: isViewerAdmin,
    className: isViewerAdmin 
      ? 'bg-gray-100 cursor-not-allowed'
      : '',
  };
};

export const shouldShowViewerAdminBadge = (isViewerAdmin: boolean) => {
  return isViewerAdmin;
};

