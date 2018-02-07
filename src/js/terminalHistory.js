import $ from 'jquery';
import KeyCodes from './keyCodes';

export const upInputStack = [];
export const downInputStack = [];

export const handleHistory = function(keycode) {
    let commandInput = $('input#command');
    let popping = keycode == KeyCodes.ARROW_UP ? upInputStack : downInputStack;
    let pushing = keycode == KeyCodes.ARROW_UP ? downInputStack : upInputStack;
    let txt = popping.pop();
    if(txt && txt.length > 0) {
        commandInput.val(txt);
        pushing.push(txt);
    }
    else if(keycode == KeyCodes.ARROW_DOWN && downInputStack.length == 0) {
        commandInput.val('');
    }
};