const lsCommand = function(options, args, input) {
    console.log("ops=",options);
    console.log("args=",args);
    if(options[0] == 'a') {
        return 'All';
    }
    return 'Listing...';
}

export const AllCommands = {
    ls: {
        helpText: 'Lists files',
        execute: lsCommand,
        possibleOptions: [ 'a' ]
    }
};

export const GenericOptions = [ 'h', 'help' ];