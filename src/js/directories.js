import { openResume } from './resumeViewer';

export default {
    '~': {
        items: [ 'about', 'projects', 'resume', 'contact', 'site-info'],
        about: {
            contents: '#about'
        },
        projects: {
            items: [  'SwanStation', 'Internship2018', 'FastAndMobile', 'EnemyClouds', 'FishNet', 'EcoSpan' ],
            swanstation: {
                contents: '#project-swan-station'
            },
            fastandmobile: {
                contents: '#fastandmobile-presentation'
            },
            internship2018: {
                contents: '#project-laz-offline-books'
            },
            enemyclouds: {
                contents: '#project-enemy-clouds'
            },
            fishnet: {
                contents: '#project-fishnet'
            },
            ecospan: {
                contents: '#project-ecospan'
            }
        },
        resume: {
            execute: openResume
        },
        contact: {
            contents: '#contact'
        },
        ['site-info']: {
            contents: '#site-info'
        },
    }
};
