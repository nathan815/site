import $ from 'jquery';
import PDFObject from 'pdfobject';

export const openResume = function() {
    $('#resume-close').off('click').on('click', function() {
        $('#resume-viewer-container').hide(250);
    });
    $('#resume-viewer-container').show(250);
    PDFObject.embed("resume.pdf", "#resume-viewer");
};