import $ from 'jquery';
import { arrHas } from './helpers';
import { $terminalOutput } from './elements';
import { Directory, DirectoryList } from './directorySystem';

const defaultOutput = $terminalOutput.html();

const lsCommand = function(options, args, input) {
    let output = '';
    let dir = Directory.current;
    if(args[0] !== undefined && args[0].trim() != '') {
        dir = args[0];
    }
    let precedingDir = (dir != Directory.current ? dir + '/' : '').replace('//','/');
    return Directory.generateContents(dir) + '\n[type <b>open <i>'+precedingDir+'item-name</i></b> to view an item]';
};

const gitCommand = function(options, args) {
    if(args[0] == 'init')
        return 'fatal: unable to initialize git repository (permission denied)';
    else if(options[0] == 'version')
        return 'git version 2.14.3 (Apple Git-98)';

    return 'fatal: Not a git repository (or any of the parent directories): .git';
};

const clearCommand = function() {
    $terminalOutput.html(defaultOutput);
    return false;
};

const listAllCommands = function() {
    let output = 'Available commands:';
    for(let commandName in AllCommands) {
        let command = AllCommands[commandName];
        if(!command.hidden) {
            output += '\n' + commandName + '\t';
            output += '<span class="grey">' + (command.helpText ? ' - ' + command.helpText : '') + '</span>';
        }
    }
    return output;
};

const helpCommand = function(options, args) {
    if(!args[0]) {
        return listAllCommands();
    }
    let command = AllCommands[args[0]];
    if(command == undefined)
        throw new Error('help: '+args[0]+': command not found');
    return 'Help entry for '+args[0]+': \n  ' + (command.helpEntry ? command.helpEntry : 'No help entry defined.');
};

const openCommand = function(options, args) {
    if(args.length == 0)
        return true;
    let path = args[0];

    let dir = Directory.parseDir(path);
    let output = '';

    // if it's a directory, cd && ls
    if(dir.items) {
        cdCommand(null, [ path ]);
        output = lsCommand(null, [ '' ]);
    }

    // if it is a "file", display its contents
    // or execute its function
    if(dir.contents) {
        if(dir.contents.indexOf('#') == 0) 
            output += $(dir.contents).html().trim();
        else
            output += dir.contents
    }
    if(typeof dir.execute == 'function') {
        return dir.execute;
    }
    return output;
};

const cdCommand = function(options, args) {
    if(args.length == 0)
        return true;

    let path = args[0];
    if(path == '~') { // navigating to home
        Directory.setCurrentDirectory('~', DirectoryList['~']);
        return true;
    }
    if(path == '..' && Directory.current != '~') { // navigating up
        Directory.goBack();
        return true;
    }
    let dir = Directory.parseDir(path);
    if(!dir.items)
        throw new Error(path+': Not a directory (use <b>open</b> instead)');
    Directory.setCurrentDirectory(path, dir);
    return true;
};

export const AllCommands = {
    cd: {
        execute: cdCommand,
        helpText: 'changes current working directory',
        possibleOptions: []
    }, 
    ls: {
        execute: lsCommand,
        possibleOptions: [],
        helpText: 'lists the menu options',
        helpEntry: 'Lists the menu options. No available options.'
    },
    clear: {
        execute: clearCommand,
        helpText: 'clears the output',
        possibleOptions: []
    },
    git: {
        execute: gitCommand,
        possibleOptions: [ 'version', 'm' ],
        helpEntry: 'Git is the best source control system.\n  Available options: --version',
        hidden: true
    },
    help: {
        execute: helpCommand,
        helpText: 'lists all commands, or displays help for a command',
        helpEntry: 'Lists all commands, or displays help for a command.\n  Available options: --hidden (show hidden commands)',
        possibleOptions: [ 'hidden' ]
    },
    open: {
        execute: openCommand,
        helpText: 'opens a directory or file and displays its contents',
        possibleOptions: []
    }
};