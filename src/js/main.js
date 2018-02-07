import $ from 'jquery';
import KeyCodes from './keyCodes';
import { processCommand } from './commandHandler';
import { handleHistory, upInputStack, downInputStack } from './terminalHistory';
import { terminalWindow, terminalOutput, commandInput } from './elements';

terminalWindow.on('click', function(e) {
    let haveSel = getSelection().toString().length > 0;
    if(!haveSel) {
        commandInput.focus();
        commandInput.val(commandInput.val());
    }
});

commandInput.on('keydown', function(e) {
    let txt = '';
    switch(e.which) {
        case KeyCodes.ENTER:
            while(downInputStack.length > 0) {
                upInputStack.push(downInputStack.pop());
            }
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

    commandInput.val('');
    if(output.length > 0) {
        let text = '';
        if(terminalOutput.text() != '') {
            text = '\n'
        }
        text += '$ ' + input + '\n' + output;
        terminalOutput.append(text);
    }
    if(input.length > 0) {
        upInputStack.push(input);
    }
};