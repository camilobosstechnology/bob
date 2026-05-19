// src/hooks/useGetMetrics/transformData.js
import initialData from "../../data/initialData.json";
import mergedata from "../useGetMetrics/mergeData";

export function transformData(raw) {
  // Helpful while debugging – you can remove later
  console.log("[transformData] raw payload:", raw);

  // Try to locate the analytics object in common shapes:
  // 1) { analytics: {...} }
  // 2) { data: { analytics: {...} } }
  const analytics = raw?.analytics || raw?.data?.analytics || null;

  // If we still didn't find analytics, fall back to initialData
  if (!analytics || typeof analytics !== "object") {
    console.warn("[transformData] No analytics found, using initialData");
    return { status: "success", data: initialData.data };
  }

  const transformSentiments = (sentiments, threshold) => {
    const vals = Object.values(sentiments || {});
    const total = vals.reduce((sum, val) => sum + Number(val || 0), 0) || 1;

    return Object.entries(sentiments || {}).map(([label, value]) => {
      const percentage = (Number(value || 0) / total) * 100;
      return {
        id: crypto.randomUUID(),
        label,
        percentage: Number(percentage.toFixed(2)),
        exceeded: percentage > threshold
      };
    });
  };

  const transform = (obj, existingArray = []) => {
    if (!obj || typeof obj !== "object") return [...existingArray];

    const vals = Object.values(obj);
    const total = vals.reduce((sum, val) => sum + Number(val || 0), 0) || 1;

    const transformed = Object.entries(obj).map(([label, value]) => {
      const percentage = (Number(value || 0) / total) * 100;
      return {
        id: crypto.randomUUID(),
        label,
        percentage: Number(percentage.toFixed(2))
      };
    });

    return [...existingArray, ...transformed];
  };

  // Use the normalized analytics object
  const avgDurationAbs = Math.abs(
    Number(analytics.chat_average_duration ?? analytics.chatAverageDuration ?? 0)
  );

  const moods = transformSentiments(analytics.sentiments || {}, 30);
  const topics = transform(analytics.topics || {}, initialData.data.topics);
  const actions = transform(analytics.trends || {}, initialData.data.actions);

  const { totalMoods, totalUsers } = mergedata(
    initialData,
    moods,
    Number(analytics.unique_users || 0)
  );

  const sessionsByChannel = analytics.sessions_by_channel || {};

  const webAdd = sessionsByChannel["Web chat"] ?? 0;
  const whatsappAdd = sessionsByChannel["whatsapp"] ?? 0;
  const appMobileAdd = sessionsByChannel["appMobile"] ?? 0;

  const initialTotalUsers = Number(initialData.data.totalUsers.total || 0);
  const apiUsers = Number(analytics.unique_users || 0);
  const totalUsersTotal = initialTotalUsers + apiUsers;

  return {
    status: "success",
    data: {
      nps: "23",
      avg: {
        status: "high",
        duration: `${Math.trunc((avgDurationAbs + 200) / (initialTotalUsers + apiUsers || 1))} min`
      },
      totalUsers: {
        total: totalUsersTotal,
        status: "warning"
      },
      channels: {
        web: Number(initialData.data.channels.web || 0) + (Number(webAdd) || 0),
        whatsapp: Number(initialData.data.channels.whatsapp || 0) + (Number(whatsappAdd) || 0),
        appMobile: Number(initialData.data.channels.appMobile || 0) + (Number(appMobileAdd) || 0)
      },
      actions,
      topics,
      moods: totalMoods,
      stats: initialData.data.stats,
      outcomeStats: initialData.data.outcomeStats,
      faqs: initialData.data.faqs
    }
  };
}
