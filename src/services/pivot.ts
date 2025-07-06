import axios from "axios";

const API_URL =
  import.meta.env.VITE_API_URL || "https://gateway.smit.team/public/pivot";

export interface Dimension {
  id: string;
  name: string;
  type: "dimension";
}

export interface Metric {
  id: string;
  name: string;
  type: "metric";
}

export const pivotService = {
  async getDimensionsAndMetrics(): Promise<{
    dimensions: Dimension[];
    metrics: Metric[];
  }> {
    const response = await axios({
      method: "GET",
      url: `${API_URL}/dimension-metrics`,
    });
    return response.data;
  },

  async getPivotData({
    dimensions,
    metrics,
    type,
  }: {
    dimensions: string[];
    metrics: string[];
    type: string;
  }): Promise<any> {
    const response = await axios({
      method: "POST",
      url: `${API_URL}/data`,
      data: { dimensions, metrics, type },
    }).catch((e) => ({ error: true, data: e.response.data }));

    return response.data;
  },

  request: (options: any) => {
    return axios({
      method: options.method,
      url: `${API_URL}/${options.url}`,
      data: options.data,
      params: options.params,
    }).catch((e) => ({ error: true, data: e.response.data }));
  },
};
