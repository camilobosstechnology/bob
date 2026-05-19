// Components
import Loader from "components/Loader";
import Header from "components/Header";

// Containers
import MetricsContainer from "containers/MetricsContainer";

// Hooks
import useFetchApi from "hooks/useFetchApi";
// import useGetMetrics from "hooks/useGetMetrics"; // still optional

export default function MainContainer() {
  // If you prefer the wrapper:
  // const { metrics, isLoading, sentiments } = useGetMetrics(accountId);

  // Use runtime API_URL + API_TOKEN + API_ENDPOINT from window.__APP_CONFIG__
  const { metrics1, sentiments, isLoading1 } = useFetchApi(
    undefined, // <- use default endpoint from config.js
    undefined, // <- use default token from config.js
    5000000 // refresh interval
    // If we need another endpoint, we can specify it here:
    // useFetchApi("another/path/here", undefined, 10000);
  );
  // console.log("metrics1:", metrics1);
  return (
    <main className="main-container">
      <Header />

      {/* {isLoading1 && <Loader title="Loading metrics...." />} */}

      {!isLoading1 && (
        <div className="main-box">
          <MetricsContainer metrics={metrics1?.data} moods={sentiments} />
        </div>
      )}
    </main>
  );
}
