/**
 * DateTime utility functions
 */
export class DateTimeUtils {
    static updateDateTime() {
        const now = new Date();
        const time = now.toLocaleTimeString();
        const date = now.toLocaleDateString();
        const datetimeElement = document.getElementById('datetime');
        if (datetimeElement) {
            datetimeElement.textContent = `${date} ${time}`;
        }
    }

    static startDateTimeUpdater() {
        this.updateDateTime();
        setInterval(() => this.updateDateTime(), 1000);
    }
}
