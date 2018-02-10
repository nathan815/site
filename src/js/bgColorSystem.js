import $ from 'jquery';

const colorClasses = 'red yellow green';
const $body = $('body');
const $changeBack = $('#color-change-back');

const revertBgColor = function() {
    $body.removeClass(colorClasses);
};
const changeBgColor = function() {
    const color = $(this).data('color');
    if($body.hasClass(color)) {
        revertBgColor();
        return;
    }
    revertBgColor();
    $body.addClass(color);
};
export default changeBgColor;