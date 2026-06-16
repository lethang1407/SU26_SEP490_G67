import React, { useEffect } from "react";

const useDocumentTitle = (title) => {
  useEffect(() => {
    if (title) {
      document.title = title;
    }
  }, [title]);
};

export default useDocumentTitle;
