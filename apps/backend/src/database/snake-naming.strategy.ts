import { DefaultNamingStrategy, NamingStrategyInterface } from 'typeorm';

function toSnake(str: string): string {
  return str.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
}

export class SnakeNamingStrategy
  extends DefaultNamingStrategy
  implements NamingStrategyInterface
{
  columnName(propertyName: string, customName: string): string {
    return customName || toSnake(propertyName);
  }

  joinColumnName(relationName: string, referencedColumnName: string): string {
    return toSnake(relationName + '_' + referencedColumnName);
  }

  joinTableName(firstTable: string, secondTable: string, firstProperty: string): string {
    return toSnake(firstTable + '_' + firstProperty);
  }

  joinTableColumnName(tableName: string, propertyName: string, columnName?: string): string {
    return toSnake(tableName + '_' + (columnName || propertyName));
  }
}
