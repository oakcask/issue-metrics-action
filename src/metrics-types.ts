export type MetricType = 'count' | 'gauge';

export type Tags = {
  [key: string]: string | boolean;
};

export interface Metric {
  type: MetricType;
  name: string;
  value: number;
  tags: Tags;
}
