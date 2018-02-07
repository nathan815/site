import $ from 'jquery';
import { processCommand } from './commandHandler';

const KEY_ENTER = 13;

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

commandInput.on('keypress', function(e) {
    let input = this.value;
    let output = null;
    try {
        if(e.which == KEY_ENTER) 
            output = processCommand(input);
    } catch(e) {
        output = e.message;
    }

    if(output && output.length > 0) {
        terminalOutput.append('\n' + output);
        commandInput.val('');
    }
});