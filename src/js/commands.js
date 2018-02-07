import { arrHas } from './helpers';
import { $terminalOutput } from './elements';

const lsCommand = function(options, args, input) {
    if(options[0] == 'a') {
        return 'All';
    }
    return '. \t ..';
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

export const AllCommands = {
    ls: {
        execute: lsCommand,
        possibleOptions: [ 'a' ],
        helpText: 'Lists files'
    },
    git: {
        execute: gitCommand,
        possibleOptions: [ 'version' ],
        helpText: 'Git is the best source control system.'
    },
    clear: {
        execute: clearCommand,
        possibleOptions: []
    }
};

export const GenericOptions = [ 'h', 'help' ];