import $ from 'jquery';
import KeyCodes from './keyCodes';
import { $commandInput } from './elements';

const stack = { up: [], down: [] };

const handleHistory = function(keycode) {
    let popping = keycode == KeyCodes.ARROW_UP ? stack.up : stack.down;
    let pushing = keycode == KeyCodes.ARROW_UP ? stack.down : stack.up;
    let txt = popping.pop();
    let input = $commandInput.val().trim();

    if(txt && txt.length > 0) {
        $commandInput.val(txt);
        pushing.push(txt);
    }
    else if(keycode == KeyCodes.ARROW_DOWN && stack.down.length == 0) {
        $commandInput.val('');
    }
};

const clearDownInputStack = function() {
    while(stack.down.length > 0) {
        stack.up.push(TerminalHistory.stack.down.pop());
    }
};

const TerminalHistory = {
    stack: stack,
    handleHistory: handleHistory,
    clearDownInputStack: clearDownInputStack
};

export default TerminalHistory;