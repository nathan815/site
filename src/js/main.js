import $ from 'jquery';
import { processCommand } from './commandHandler';

const KEY_ENTER = 13;
const KEY_UP = 38;
const KEY_DOWN = 40;

const terminalWindow = $('div#window');
const terminalOutput = $('div#output');
const commandInput = $('input#command');

const upInputStack = [];
const downInputStack = [];

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
        case KEY_ENTER:
            while(downInputStack.length > 0) {
                upInputStack.push(downInputStack.pop());
            }
            handleInput(this.value);
            break;
        case KEY_UP:
        case KEY_DOWN:
            e.preventDefault();
            handleHistory(e.which);
            break;
    }
});

const handleHistory(keycode) {
    let popping = keycode == KEY_UP ? upInputStack : downInputStack;
    let pushing = keycode == KEY_UP ? downInputStack : upInputStack;
    let txt = popping.pop();
    if(txt && txt.length > 0) {
        commandInput.val(txt);
        pushing.push(txt);
    }
}

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