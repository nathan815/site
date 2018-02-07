import $ from 'jquery';
import KeyCodes from './keyCodes';
import { processCommand } from './commandHandler';
import { $terminalWindow, $terminalOutput, $commandInput } from './elements';
import { handleHistory, historyStack, clearDownInputStack } from './terminalHistory';

$terminalWindow.on('click', function(e) {
    let haveSel = getSelection().toString().length > 0;
    if(!haveSel) {
        $commandInput.focus();
    }
});

$commandInput.on('keydown', function(e) {
    let txt = '';
    switch(e.which) {
        case KeyCodes.ENTER:
            clearDownInputStack();
            handleInput(this.value);
            break;
        case KeyCodes.ARROW_UP:
        case KeyCodes.ARROW_DOWN:
            e.preventDefault();
            handleHistory(e.which);
            break;
    }
});

const handleInput = function(input) {
    let output = '';

    try {
        output = processCommand(input);
    } catch(e) {
        output = e.message;
    }

    $commandInput.val('');
    if(output.length > 0) {
        let text = '';
        if($terminalOutput.text() != '') {
            text = '\n'
        }
        text += '$ ' + input + '\n' + output;
        $terminalOutput.append(text);
    }
    if(input.length > 0) {
        historyStack.up.push(input);
    }
};