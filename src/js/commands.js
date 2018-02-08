import { arrHas } from './helpers';
import { $terminalOutput } from './elements';
import { Directory } from './directorySystem';

const info = require('./../../information.json');

const lsCommand = function(options, args, input) {
    let output = '';
    let dir = Directory.current;
    if(args[0] !== undefined && args[0].trim() != '') {
        dir = args[0];
    }
    let precedingDir = dir != Directory.current ? (dir + '/') : '';
    return Directory.generateContents(dir) + '\n[type <span class="blue">cd <i>'+precedingDir+'item-name</i></span> to view an item]';
}

const gitCommand = function(options, args) {
    if(args[0] == 'init')
        return 'fatal: unable to initialize git repository (permission denied)';
    else if(options[0] == 'version')
        return 'git version 2.14.3 (Apple Git-98)';

    return 'fatal: Not a git repository (or any of the parent directories): .git';
}

const clearCommand = function() {
    $terminalOutput.text('');
}

const listAllCommands = function() {
    let output = 'Available commands:';
    for(let commandName in AllCommands) {
        let command = AllCommands[commandName];
        if(!command.hidden) {
            output += '\n' + commandName + '\t';
            output += '<span class="blue italic">' + (command.helpText ? ' - ' + command.helpText : '') + '</span>';
        }
    }
    return output;
}

const helpCommand = function(options, args) {
    if(!args[0]) {
        return listAllCommands();
    }
    let command = AllCommands[args[0]];
    if(command == undefined)
        throw new Error('help: '+args[0]+': command not found');
    return 'Help entry for '+args[0]+': \n  ' + (command.helpEntry ? command.helpEntry : 'No help entry defined.');
}

export const AllCommands = {
    ls: {
        execute: lsCommand,
        possibleOptions: [],
        helpText: 'lists the menu options',
        helpEntry: 'Lists the menu options. No available options.'
    },
    git: {
        execute: gitCommand,
        possibleOptions: [ 'version' ],
        helpEntry: 'Git is the best source control system.\n  Available options: --version',
        hidden: true
    },
    clear: {
        execute: clearCommand,
        helpText: 'clears the output',
        possibleOptions: []
    },
    help: {
        execute: helpCommand,
        helpText: 'lists all commands, or displays help for a command',
        possibleOptions: []
    }
};