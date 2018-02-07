import $ from 'jquery';
import { processCommand } from './commandHandler';
import { handleHistory, upInputStack, downInputStack } from './terminalHistory';
import KeyCodes from './keyCodes';

const terminalWindow = $('div#window');
const terminalOutput = $('div#output');
const commandInput = $('input#command');

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

    if(output.length > 0) {
        terminalOutput.append('\n$ ' + input + '\n' + output);
        commandInput.val('');
    }
    if(input.length > 0) {
        upInputStack.push(input);
    }
};