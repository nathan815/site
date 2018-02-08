export const arrHas = function(arr, ele) {
    return arr.indexOf(ele) > -1;
}

export const htmlEntities = function(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}