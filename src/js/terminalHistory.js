import $ from 'jquery';
import KeyCodes from './keyCodes';
import { $commandInput } from './elements';

export const upInputStack = [];
export const downInputStack = [];

export const handleHistory = function(keycode) {
    let popping = keycode == KeyCodes.ARROW_UP ? upInputStack : downInputStack;
    let pushing = keycode == KeyCodes.ARROW_UP ? downInputStack : upInputStack;
    let txt = popping.pop();
    if(txt && txt.length > 0) {
        $commandInput.val(txt);
        pushing.push(txt);
    }
    else if(keycode == KeyCodes.ARROW_DOWN && downInputStack.length == 0) {
        commandInput.val('');
    }
};

export const clearDownInputStack = function() {
    while(downInputStack.length > 0) {
        upInputStack.push(downInputStack.pop());
    }
};