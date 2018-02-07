import $ from 'jquery';
import KeyCodes from './keyCodes';
import { $commandInput } from './elements';

export const historyStack = { up: [], down: [] };

export const handleHistory = function(keycode) {
    let popping = keycode == KeyCodes.ARROW_UP ? historyStack.up : historyStack.down;
    let pushing = keycode == KeyCodes.ARROW_UP ? historyStack.down : historyStack.up;
    let txt = popping.pop();

    if(txt && txt.length > 0) {
        $commandInput.val(txt);
        pushing.push(txt);
    }
    else if(keycode == KeyCodes.ARROW_DOWN && historyStack.down.length == 0) {
        $commandInput.val('');
    }
};

export const clearDownInputStack = function() {
    while(historyStack.down.length > 0) {
        historyStack.up.push(historyStack.down.pop());
    }
};