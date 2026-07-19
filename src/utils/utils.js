
const showToastError = (showToast, setLoading, message) => {
    showToast('error', message);
    setLoading(false);
}

const handleToastLoading = (showToast, setLoading, message) => {
    setLoading(true);
    showToast('loading', message);
}

export { showToastError, handleToastLoading };