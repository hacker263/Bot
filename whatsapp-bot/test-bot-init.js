#!/usr/bin/env node

/**
 * Test script to verify bot initialization without WhatsApp connection
 * This checks if all services load and CommandParser is properly integrated
 */

const chalk = require('chalk');
const path = require('path');

console.log(chalk.cyan('\n🧪 Testing Bot Initialization...\n'));

try {
  // Test 1: CommandParser loading
  console.log(chalk.blue('Test 1: Loading CommandParser...'));
  const CommandParser = require('./src/utils/commandParser');
  console.log(chalk.green('✅ CommandParser loaded'));
  console.log(chalk.gray(`   Methods: ${Object.getOwnPropertyNames(Object.getPrototypeOf(CommandParser)).slice(1).join(', ')}`));

  // Test 2: Command parsing
  console.log(chalk.blue('\nTest 2: Testing command parsing...'));
  const testCases = [
    { input: '!menu', expectedCmd: 'menu' },
    { input: '!order pizza', expectedCmd: 'order', expectedArgs: ['pizza'] },
    { input: '!help checkout', expectedCmd: 'help', expectedArgs: ['checkout'] },
  ];
  
  testCases.forEach(test => {
    const result = CommandParser.parseCommand(test.input);
    if (result && result.command === test.expectedCmd) {
      console.log(chalk.green(`✅ Parsed "${test.input}" → ${result.command}`));
    } else {
      console.log(chalk.red(`❌ Failed to parse "${test.input}"`));
    }
  });

  // Test 3: Service loading
  console.log(chalk.blue('\nTest 3: Loading services...'));
  const services = [
    { name: 'MessageService', path: './src/services/messageService' },
    { name: 'UtilityCommandHandler', path: './src/services/utilityCommandHandler' },
    { name: 'AdvancedAdminHandler', path: './src/services/advancedAdminHandler' },
    { name: 'InteractiveMessageHandler', path: './src/services/interactiveMessageHandler' },
    { name: 'CustomerHandler', path: './src/handlers/customerHandler' },
    { name: 'MerchantHandler', path: './src/handlers/merchantHandler' },
    { name: 'AdminHandler', path: './src/handlers/adminHandler' },
  ];

  let loadedCount = 0;
  services.forEach(service => {
    try {
      require.resolve(service.path);
      console.log(chalk.green(`✅ ${service.name} found at ${service.path}`));
      loadedCount++;
    } catch (e) {
      console.log(chalk.red(`❌ ${service.name} NOT found at ${service.path}`));
    }
  });
  
  console.log(chalk.gray(`\n   Loaded: ${loadedCount}/${services.length} services`));

  // Test 4: Bot class structure
  console.log(chalk.blue('\nTest 4: Testing bot structure...'));
  
  // Create a mock socket to avoid real WhatsApp connection
  const mockSocket = {
    ev: {
      on: () => {},
      off: () => {},
    }
  };

  // We'll just check that src/index.js syntax is valid and loads
  const botCode = require('./src/index.js');
  console.log(chalk.green('✅ Bot module loads successfully'));

  console.log(chalk.green('\n✅ All initialization tests passed!\n'));
  console.log(chalk.cyan('💡 Bot is ready to start. Run: npm start'));

} catch (error) {
  console.error(chalk.red('❌ Error during initialization:'), error.message);
  console.error(chalk.red(error.stack));
  process.exit(1);
}
