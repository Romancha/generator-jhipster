/**
 * Copyright 2013-2020 the original author or authors from the JHipster project.
 *
 * This file is part of the JHipster project, see https://www.jhipster.tech/
 * for more information.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
const chalk = require('chalk');
const statistics = require('../statistics');
const packagejs = require('../../package.json');

module.exports = {
    askForInsightOptIn,
    askForApplicationType,
    askForModuleName,
    askForI18n,
    askFori18n,
    askForTestOpts,
    askForMoreModules,
};

async function askForInsightOptIn() {
    const answers = await this.prompt({
        when: () => statistics.shouldWeAskForOptIn(),
        type: 'confirm',
        name: 'insight',
        message: `May ${chalk.cyan('JHipster')} anonymously report usage statistics to improve the tool over time?`,
        default: true,
    });
    if (answers.insight !== undefined) {
        statistics.setOptoutStatus(!answers.insight);
    }
}

async function askForApplicationType() {
    if (this.existingProject) return;

    const DEFAULT_APPTYPE = 'monolith';

    const applicationTypeChoices = [
        {
            value: DEFAULT_APPTYPE,
            name: 'Monolithic application (recommended for simple projects)',
        },
        {
            value: 'microservice',
            name: 'Microservice application',
        },
        {
            value: 'gateway',
            name: 'Microservice gateway',
        },
        {
            value: 'uaa',
            name: 'JHipster UAA server',
        },
    ];

    const answers = await this.prompt([
        {
            type: 'list',
            name: 'applicationType',
            message: `Which ${chalk.yellow('*type*')} of application would you like to create?`,
            choices: applicationTypeChoices,
            default: DEFAULT_APPTYPE,
        },
        {
            when: answers => ['gateway', 'monolith', 'microservice'].includes(answers.applicationType),
            type: 'confirm',
            name: 'reactive',
            message: '[Beta] Do you want to make it reactive with Spring WebFlux?',
            default: false,
        },
    ]);
    this.applicationType = this.configOptions.applicationType = answers.applicationType;
    this.reactive = this.configOptions.reactive = answers.reactive || false;
}

function askForModuleName() {
    if (this.existingProject) return undefined;
    return this.askModuleName(this);
}

function askForI18n() {
    if (this.skipI18n || this.existingProject) return;
    this.aski18n(this);
}

/**
 * @deprecated Use askForI18n() instead.
 * This method will be removed in JHipster v7.
 */
function askFori18n() {
    // eslint-disable-next-line no-console
    console.log(chalk.yellow('\nPlease use askForI18n() instead. This method will be removed in v7\n'));
    this.askForI18n();
}

async function askForTestOpts() {
    if (this.existingProject) return undefined;

    const choices = [];
    const defaultChoice = [];
    if (!this.skipServer) {
        // all server side test frameworks should be added here
        choices.push({ name: 'Gatling', value: 'gatling' }, { name: 'Cucumber', value: 'cucumber' });
    }
    if (!this.skipClient) {
        // all client side test frameworks should be added here
        choices.push({ name: 'Protractor', value: 'protractor' });
    }
    const PROMPT = {
        type: 'checkbox',
        name: 'testFrameworks',
        message: 'Besides JUnit and Jest, which testing frameworks would you like to use?',
        choices,
        default: defaultChoice,
    };

    const answers = await this.prompt(PROMPT);
    this.testFrameworks = answers.testFrameworks;
    return answers;
}

function askForMoreModules() {
    if (this.existingProject) {
        return undefined;
    }

    return this.prompt({
        type: 'confirm',
        name: 'installModules',
        message: 'Would you like to install other generators from the JHipster Marketplace?',
        default: false,
    }).then(answers => {
        if (answers.installModules) {
            return new Promise(resolve => askModulesToBeInstalled(resolve, this));
        }
        return undefined;
    });
}

function askModulesToBeInstalled(done, generator) {
    const jHipsterMajorVersion = packagejs.version.match(/^(\d+)/g);

    generator.httpsGet(
        `https://api.npms.io/v2/search?q=keywords:jhipster-module+jhipster-${jHipsterMajorVersion}&from=0&size=50`,
        body => {
            try {
                const moduleResponse = JSON.parse(body);
                const choices = [];
                moduleResponse.results.forEach(modDef => {
                    choices.push({
                        value: { name: modDef.package.name, version: modDef.package.version },
                        name: `(${modDef.package.name}-${modDef.package.version}) ${modDef.package.description}`,
                    });
                });
                if (choices.length > 0) {
                    generator
                        .prompt({
                            type: 'checkbox',
                            name: 'otherModules',
                            message: 'Which other modules would you like to use?',
                            choices,
                            default: [],
                        })
                        .then(answers => {
                            // [ {name: [moduleName], version:[version]}, ...]
                            answers.otherModules.forEach(module => {
                                generator.otherModules.push({ name: module.name, version: module.version });
                            });
                            generator.configOptions.otherModules = generator.otherModules;
                            done();
                        });
                } else {
                    done();
                }
            } catch (err) {
                generator.warning(`Error while parsing. Please install the modules manually or try again later. ${err.message}`);
                generator.debug('Error:', err);
                done();
            }
        },
        error => {
            generator.warning(`Unable to contact server to fetch additional modules: ${error.message}`);
            generator.debug('Error:', error);
            done();
        }
    );
}
